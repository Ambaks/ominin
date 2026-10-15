"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PHOTO_SIZES, type Photo } from "@/lib/sites/cyprien";
import { Media } from "./ui";

export type StoryChapter = {
  id: string;
  kicker: string;
  title: ReactNode;
  body: ReactNode;
  photo: Photo;
  focus?: string;
};

/*
 * Récit au défilement : sur grand écran la photo reste épinglée et change
 * avec le chapitre qui passe au milieu de l’écran (rideau vers le haut en
 * avançant, vers le bas en revenant). Sur mobile, chaque chapitre porte sa
 * photo. Sans JavaScript, la première photo reste affichée.
 */
export function Story({ chapters, after }: { chapters: StoryChapter[]; after?: ReactNode }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  // Le chapitre actif est le dernier dont le haut a passé le milieu de
  // l’écran : juste même après un saut (ancre, retour arrière). Le calcul ne
  // tourne que tant que le récit est à l’écran.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const chapters = [...list.children];
    let frame = 0;
    const measure = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      const passed = chapters.filter((chapter) => chapter.getBoundingClientRect().top < middle).length;
      setActive(Math.max(0, passed - 1));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      } else window.removeEventListener("scroll", onScroll);
    });
    observer.observe(list);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="cy-story">
      <div className="cy-story-media">
        <div className="cy-story-frame">
          {chapters.map((chapter, index) => (
            <div key={chapter.id} className="cy-story-img" data-shown={index <= active} style={{ zIndex: index }}>
              <Image
                src={chapter.photo.src}
                alt={chapter.photo.alt}
                fill
                sizes={PHOTO_SIZES}
                className="object-cover"
                style={chapter.focus ? { objectPosition: chapter.focus } : undefined}
              />
            </div>
          ))}
        </div>
        <div className="cy-story-meta" aria-hidden="true">
          <span className="cy-story-count">
            <span key={active} className="cy-story-count-now">
              {pad(active + 1)}
            </span>
            <span className="cy-story-count-total">/{pad(chapters.length)}</span>
          </span>
          <span className="cy-story-rail">
            {chapters.map((chapter, index) => (
              <span key={chapter.id} data-on={index <= active} />
            ))}
          </span>
        </div>
      </div>

      <div className="cy-story-text">
        <ol ref={listRef} className="cy-story-chapters">
          {chapters.map((chapter, index) => (
            <li key={chapter.id} data-index={index} data-active={index === active} className="cy-story-chapter">
              <Media
                photo={chapter.photo}
                focus={chapter.focus}
                className="cy-story-inline aspect-[4/3]"
              />
              <p className="cy-story-kicker">
                <span>{pad(index + 1)}</span> {chapter.kicker}
              </p>
              <h3 className="cy-story-title">{chapter.title}</h3>
              <div className="cy-story-body">{chapter.body}</div>
            </li>
          ))}
        </ol>
        {after && <div className="cy-story-after">{after}</div>}
      </div>
    </div>
  );
}
