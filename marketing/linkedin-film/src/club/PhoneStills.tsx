import { Sequence, useCurrentFrame } from "remotion";
import { BarSheet, LockScreen, MenuScreen, PaySheet, ScanScreen, TicketScreen } from "./screens";

/*
 * The page's phone screens (frontend/public/pitch/club/phone-*.webp), one a
 * frame, each held once its springs have settled: the film's own screens,
 * so the page and the film show the same phone. Each screen has a block of
 * SPAN frames and its still is the block's last, once its springs have
 * settled: `remotion still Club-Phone --frame=<i × SPAN + SPAN − 1> --scale=3`.
 */
export const SPAN = 60;

export const PHONE_STILLS = [
  { name: "scan", screen: <ScanScreen lock={10} link={20} /> },
  { name: "menu", screen: <MenuScreen adds={[10, 20]} /> },
  {
    name: "bar",
    screen: (
      <>
        <MenuScreen adds={[0, 0]} />
        <BarSheet at={0} pick={10} />
      </>
    ),
  },
  {
    name: "pay",
    screen: (
      <>
        <MenuScreen adds={[0, 0]} />
        <PaySheet at={0} paid={10} />
      </>
    ),
  },
  { name: "ticket", screen: <TicketScreen at={0} /> },
  { name: "ready", screen: <TicketScreen ready={10} /> },
  { name: "notif", screen: <LockScreen at={10} /> },
];

export const PhoneStills = () => {
  const index = Math.floor(useCurrentFrame() / SPAN);
  return (
    <Sequence from={index * SPAN} durationInFrames={SPAN}>
      {PHONE_STILLS[index].screen}
    </Sequence>
  );
};
