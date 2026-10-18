import { Geist, Geist_Mono } from "next/font/google";

/*
 * Les écrans « Soirées » de la gestion parlent la langue des pages du club :
 * Geist pour le texte et les titres, Geist Mono pour les chiffres (montants,
 * tables, arrivées). preload: false, comme lib/club/fonts.ts : un restaurant
 * qui n'ouvre jamais ces écrans ne télécharge rien.
 */
const geist = Geist({ variable: "--font-soirees-sans", subsets: ["latin"], preload: false });
const geistMono = Geist_Mono({ variable: "--font-soirees-mono", subsets: ["latin"], preload: false });

export const soireesFonts = `${geist.variable} ${geistMono.variable}`;
