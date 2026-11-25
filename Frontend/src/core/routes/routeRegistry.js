// Auto-imports all domain *.routes.jsx files dynamically
const routeModules = import.meta.glob(['../../pages/**/*.routes.jsx', './*.routes.jsx'], { eager: true });

export const getRegisteredRoutes = () => {
  return Object.values(routeModules).flatMap((mod) => mod.default || []);
};
