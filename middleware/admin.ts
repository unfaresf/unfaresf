function isAdmin(): boolean {
  const { user } = useUserSession();
  const includesAdmin = user.value?.roles.includes('Admin');

  return !!includesAdmin;
}

export default defineNuxtRouteMiddleware((to, from) => {
  if (!isAdmin()) {
    // this should probably be an auth error page
    return navigateTo('/', { redirectCode: 401 });
  }
})
