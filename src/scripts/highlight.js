export const highlight = (type, index, shield = false) => () => {
  if (shield) {
    const g = document.getElementById("coaEdit").querySelector(`g.${type}[i="${index}"]`);
    g?.setAttribute("filter", "url(#highlight)");
  }
  else {
    const section = document.getElementById(`${type}_${index}`);
    section?.classList.add("highlighted");
  }
};

export const lowlight = (type, index, shield = false) => () => {
  if (shield) {
    const g = document.getElementById("coaEdit").querySelector(`g.${type}[i="${index}"]`);
    g?.removeAttribute("filter");
  }
  else {
    const section = document.getElementById(`${type}_${index}`);
    section?.classList.remove("highlighted");
  }
};
