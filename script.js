(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // Update once per paint while scrolling; no continuous animation loop.
  const scene = $(".scroll-scene");
  const progressBar = $(".scroll-progress");
  let scrollFrame = 0;
  let scrollRange = 1;
  function paintScrollScene() {
    scrollFrame = 0;
    const y = Math.max(0, window.scrollY);
    const progress = Math.min(1, y / scrollRange);
    progressBar.style.transform = "scaleX(" + progress + ")";
    if (reducedMotion.matches) return;
    const mobileScale = innerWidth < 768 ? 0.4 : 1;
    const phase = progress * Math.PI * 2;
    // Wrap exactly one grid cell so very long pages stay within the layer.
    scene.style.setProperty("--grid-y", -(y * 0.13 % 96) + "px");
    scene.style.setProperty("--light-x", Math.sin(phase) * 90 * mobileScale + "px");
    scene.style.setProperty("--light-y", Math.sin(phase * 0.7) * 180 * mobileScale + "px");
    scene.style.setProperty("--soft-x", Math.sin(phase + 1) * 75 * mobileScale + "px");
    scene.style.setProperty("--soft-y", -progress * 200 * mobileScale + "px");
    scene.style.setProperty("--orbit-y", Math.sin(phase * 0.8) * 140 * mobileScale + "px");
    scene.style.setProperty("--orbit-angle", -20 + progress * 130 + "deg");
    scene.style.setProperty("--orbit-two-y", -progress * 160 * mobileScale + "px");
    scene.style.setProperty("--orbit-two-angle", 30 - progress * 100 + "deg");
  }
  function scheduleScrollScene() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(paintScrollScene);
  }
  function measureScrollRange() {
    scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    scheduleScrollScene();
  }
  addEventListener("scroll", scheduleScrollScene, { passive: true });
  addEventListener("resize", measureScrollRange, { passive: true });
  addEventListener("pageshow", measureScrollRange);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) measureScrollRange();
  });
  reducedMotion.addEventListener("change", scheduleScrollScene);
  // Filtering projects changes the document height without a window resize.
  if ("ResizeObserver" in window) new ResizeObserver(measureScrollRange).observe(document.body);
  measureScrollRange();

  const systemTheme = matchMedia("(prefers-color-scheme: dark)");
  let themePreference;
  try {
    const saved = localStorage.getItem("exposure-theme");
    themePreference = saved === "mid" ? "dark" : ["dark", "light"].includes(saved) ? saved : null;
  } catch { themePreference = null; }
  function updateThemeLabel() {
    const theme = document.documentElement.dataset.exposure || "dark";
    const label = theme === "dark" ? "Dark" : "Light";
    const action = "Switch to " + (theme === "dark" ? "light" : "dark") + " theme";
    $("#theme-label").textContent = label;
    $("#exposure").setAttribute("aria-label", action);
    $("#exposure").title = action;
    $('meta[name="theme-color"]').content = theme === "dark" ? "#0b1220" : "#f8fafc";
  }
  updateThemeLabel();
  $("#exposure").addEventListener("click", () => {
    const next = document.documentElement.dataset.exposure === "dark" ? "light" : "dark";
    themePreference = next;
    document.documentElement.dataset.exposure = next;
    try { localStorage.setItem("exposure-theme", next); } catch {}
    updateThemeLabel();
  });
  systemTheme.addEventListener("change", (event) => {
    if (themePreference) return;
    document.documentElement.dataset.exposure = event.matches ? "dark" : "light";
    updateThemeLabel();
  });

  const menu = $("#menu");
  const navigation = $("#navigation");
  function closeMenu() {
    navigation.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
    menu.textContent = "Menu";
  }
  menu.addEventListener("click", () => {
    const open = navigation.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
    menu.textContent = open ? "Close" : "Menu";
  });
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navigation.classList.contains("open")) {
      closeMenu();
      menu.focus();
    }
  });
  matchMedia("(min-width: 768px)").addEventListener("change", closeMenu);

  const clock = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hour12: false });
  function updateClock() {
    const now = new Date();
    $("#clock").textContent = clock.format(now) + " PT";
    $("#clock").dateTime = now.toISOString();
    $("#year").textContent = now.getFullYear();
  }
  updateClock();
  setInterval(updateClock, 1000);

  if ("IntersectionObserver" in window && !reducedMotion.matches) {
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          reveal.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.documentElement.classList.add("motion-ready");
    $$(".reveal").forEach((node) => reveal.observe(node));
  }

  const projects = $$(".project");
  $$(".filters button").forEach((button) => button.addEventListener("click", () => {
    const category = button.dataset.filter;
    $$(".filters button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    projects.forEach((project) => {
      project.hidden = category !== "all" && !project.dataset.category.split(" ").includes(category);
      if (!project.hidden) project.classList.add("visible");
    });
    $("#project-count").textContent = projects.filter((project) => !project.hidden).length + " projects shown";
    measureScrollRange();
  }));

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        $$("#navigation a").forEach((link) => {
          const active = link.hash === "#" + entry.target.id;
          link.classList.toggle("active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-15% 0px -65% 0px" });
    $$("main section[id]").forEach((section) => sectionObserver.observe(section));
  }
})();
