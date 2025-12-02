export const useScrollOnOpen = (element: HTMLElement) => {
  const onOpen = async () => {
    setTimeout(() => {
      element.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 300);
  };

  return onOpen;
};
