export const useScrollOnOpen = (id: string) => {
  const onOpen = async () => {
    const element = document.getElementById(id);
    setTimeout(() => {
      element?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 300);
  };

  return onOpen;
};
