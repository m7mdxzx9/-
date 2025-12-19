document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    if (targetId.length > 1) {
      event.preventDefault();
      document.querySelector(targetId)?.scrollIntoView({ behavior: "smooth" });
    }
  });
});

const navbar = document.querySelector(".navbar");
let lastScroll = window.scrollY;

window.addEventListener("scroll", () => {
  const current = window.scrollY;
  navbar.style.opacity = current > lastScroll ? "0.92" : "1";
  lastScroll = current;
});

const assistantButton = document.getElementById("ask-assistant");
if (assistantButton) {
  assistantButton.addEventListener("click", () => {
    const prompt = encodeURIComponent(
      "السلام عليكم، أريد شرحاً لمواد خطة الذكاء الاصطناعي في جامعة أم القرى مع أمثلة عملية."
    );
    window.open(`https://chatgpt.com/?q=${prompt}`, "_blank", "noopener");
  });
}
