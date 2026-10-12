/*
 * What the Reels take from the Ominin film (marketing/linkedin-film): its
 * brand tokens, the 3D phone and the customer's screens, the kitchen ticket.
 * The film's scenes read film frames (scenes/product/times.ts): a Reel
 * plays them through <AtFilm>, which maps its own frames onto the film's.
 */
export { fonts } from "../../../marketing/linkedin-film/src/brand/fonts";
export { OmininMark } from "../../../marketing/linkedin-film/src/brand/OmininMark";
export { app, emberGradient, om } from "../../../marketing/linkedin-film/src/brand/tokens";
export { Grain } from "../../../marketing/linkedin-film/src/kit/atmosphere";
export { Device, DEVICES, pose, type Pose } from "../../../marketing/linkedin-film/src/kit/Device";
export { springs } from "../../../marketing/linkedin-film/src/kit/motion";
export { AUDIENCES, Audiences } from "../../../marketing/linkedin-film/src/scenes/Audiences";
export { Qr } from "../../../marketing/linkedin-film/src/scenes/art";
export { Accent, Backdrop, Check, clamp, ramp } from "../../../marketing/linkedin-film/src/scenes/common";
export { KitchenTicket, PANEL } from "../../../marketing/linkedin-film/src/scenes/product/panels";
export { PhoneScreen } from "../../../marketing/linkedin-film/src/scenes/product/screens";
export * as T from "../../../marketing/linkedin-film/src/scenes/product/times";
