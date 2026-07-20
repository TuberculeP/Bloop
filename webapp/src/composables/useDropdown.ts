import { ref } from "vue";

export function useDropdown(initialOpen = false) {
  const isOpen = ref(initialOpen);

  const open = () => {
    isOpen.value = true;
  };

  const close = () => {
    isOpen.value = false;
  };

  const toggle = () => {
    isOpen.value = !isOpen.value;
  };

  return { isOpen, open, close, toggle };
}
