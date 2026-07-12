function isAuthenticated(): boolean {
  const { loggedIn } = useUserSession();
  return loggedIn.value;
}

export default defineNuxtRouteMiddleware((to, from) => {
  // isAuthenticated() is an example method verifying if a user is authenticated
  if (isAuthenticated() === false) {
    return navigateTo('/sign-in', { redirectCode: 401 })
  }
})
