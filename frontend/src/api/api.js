
export const mode = import.meta.env.MODE;

export const apiUrl = () => {
  if (mode === "development") {
    return import.meta.env.VITE_API_URL;
  }

  return import.meta.env.VITE_CLOUD_API_URL;
};

