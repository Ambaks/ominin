from urllib.parse import urljoin

import httpx
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.fs as pafs
import pyarrow.parquet as pq

from app.config import settings

COLUMNS = [
    "id",
    "bbox",
    "names",
    "addresses",
    "phones",
    "websites",
    "emails",
    "operating_status",
    "basic_category",
    "taxonomy",
]

Box = tuple[float, float, float, float]  # xmin, ymin, xmax, ymax


def _overlaps(a: Box, b: Box) -> bool:
    return a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]


def place_files() -> list[tuple[Box, str]]:
    """(bbox, S3 key) of every places file in the latest release. The STAC
    items carry each file's extent, so a city is read from the one or two
    files that cover it instead of the whole planet."""
    with httpx.Client(timeout=settings.discovery_timeout_seconds) as client:
        release = client.get(settings.overture_stac_url).json()["latest"]
        collection = client.get(
            urljoin(settings.overture_stac_url, f"{release}/places/place/collection.json")
        ).json()
        files = []
        for link in collection["links"]:
            if link["rel"] != "item":
                continue
            item = client.get(link["href"]).json()
            s3 = item["assets"]["aws"]["alternate"]["s3"]["href"]
            files.append((tuple(item["bbox"]), s3.removeprefix("s3://")))
    return files


def places_in(files: list[tuple[Box, str]], box: Box, categories: list[str]) -> list[dict]:
    """Places of these basic categories whose point lies in box. Row groups
    are pruned on their bbox statistics, so only a few of each file's
    hundreds are downloaded, and read one at a time to bound memory on a
    dense city."""
    filesystem = None
    places: list[dict] = []
    for file_box, key in files:
        if not _overlaps(file_box, box):
            continue
        if filesystem is None:
            bucket = key.split("/", 1)[0]
            filesystem = pafs.S3FileSystem(
                anonymous=True, region=pafs.resolve_s3_region(bucket)
            )
        parquet = pq.ParquetFile(key, filesystem=filesystem)
        meta = parquet.metadata
        index = {meta.schema.column(i).path: i for i in range(meta.num_columns)}
        for g in range(meta.num_row_groups):
            group = meta.row_group(g)
            bounds = [
                group.column(index[f"bbox.{name}"]).statistics
                for name in ("xmin", "ymin", "xmax", "ymax")
            ]
            # A group without statistics can't be pruned: read it.
            if all(s is not None and s.has_min_max for s in bounds):
                group_box = (bounds[0].min, bounds[1].min, bounds[2].max, bounds[3].max)
            else:
                group_box = box
            if _overlaps(group_box, box):
                places.extend(_matching(parquet.read_row_group(g, columns=COLUMNS), box, categories))
    return places


def _matching(table, box: Box, categories: list[str]) -> list[dict]:
    x = pc.struct_field(table["bbox"], "xmin")
    y = pc.struct_field(table["bbox"], "ymin")
    keep = pc.and_(
        pc.is_in(table["basic_category"], value_set=pa.array(categories)),
        pc.and_(
            pc.and_(pc.greater_equal(x, box[0]), pc.less_equal(x, box[2])),
            pc.and_(pc.greater_equal(y, box[1]), pc.less_equal(y, box[3])),
        ),
    )
    return table.filter(keep).to_pylist()
