
const mode = process.env.NODE_ENV ;

let routes;

if (mode === "development") {
  routes = await import("./pos/routes.js");
} else if (mode === "production") {
  routes = await import("./mongoose/routes.js");
} else {
  throw new Error(`Unsupported NODE_ENV: ${mode}`);
}

export const {
  addCanvas,
  addSlide,
  deleteSlide,
  getCanvas,
  getSlides,
  login,
  signup,
  updateSlide,
} = routes;
