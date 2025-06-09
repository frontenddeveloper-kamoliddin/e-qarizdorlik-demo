// Firebase configni o‘zingiznikiga almashtiring!

    const firebaseConfig = {
      apiKey: "AIzaSyAgb0G3chiVfdzRXLaIqPV5R2Hx5Un3S0g",
      authDomain: "e-qarizdorlik.firebaseapp.com",
      projectId: "e-qarizdorlik",
      storageBucket: "e-qarizdorlik.appspot.com", // <-- .app emas, .com bo‘lishi kerak
      messagingSenderId: "975301245533",
      appId: "1:975301245533:web:436f9a6c3afc50fe756bb4"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    let userId = null;
    let debts = {};

    function showMsg(msg) {
      document.getElementById('authMsg').innerText = msg;
    }

    function showMsgDiv(msg, color = "red") {
      const msgDiv = document.getElementById('msgDiv');
      msgDiv.innerText = msg;
      msgDiv.className = `mb-2 text-${color}-600`;
      setTimeout(() => { msgDiv.innerText = ""; }, 4000);
    }

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function login() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      if (!isValidEmail(email)) {
        showMsg("Email manzili noto‘g‘ri kiritilgan!");
        return;
      }
      auth.signInWithEmailAndPassword(email, password)
        .then(() => showMain())
        .catch(e => showMsg(e.message));
    }

    function register() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      if (!isValidEmail(email)) {
        showMsg("Email manzili noto‘g‘ri kiritilgan!");
        return;
      }
      auth.createUserWithEmailAndPassword(email, password)
        .then(() => showMain())
        .catch(e => showMsg(e.message));
    }

    function logout() {
      auth.signOut();
      document.getElementById('mainSection').style.display = 'none';
      document.getElementById('authSection').style.display = 'flex';
    }

    function showMain() {
      document.getElementById('authSection').style.display = 'none';
      document.getElementById('mainSection').style.display = 'block';
      userId = auth.currentUser.uid;
      loadDebts();
    }

    auth.onAuthStateChanged(user => {
      if (user) showMain();
      else {
        document.getElementById('mainSection').style.display = 'none';
        document.getElementById('authSection').style.display = 'flex';
      }
    });

    function loadDebts() {
      db.collection('debts').doc(userId)
    .onSnapshot(doc => {
      debts = doc.exists ? doc.data().debts : {};
      displayDebts();
    });
    }

    function saveDebts() {
      db.collection('debts').doc(userId).set({ debts });
    }

    function addDebt() {
      if (!userId) {
        showMsgDiv("Iltimos, avval tizimga kiring!");
        return;
      }
      const name = document.getElementById('nameInput').value.trim();
      const amount = parseFloat(document.getElementById('amountInput').value) || 0;
      const eggs = parseInt(document.getElementById('eggInput').value) || 0;
      const eggPrice = parseFloat(document.getElementById('eggPriceInput').value) || 0;
      const phone = document.getElementById('phoneInput').value.trim();
      const eggType = document.getElementById('eggType').value;
      if (!name) {
        showMsgDiv("Ism kiritilishi shart!");
        return;
      }

      db.collection('debts').doc(userId).get().then(doc => {
        let currentDebts = doc.exists && doc.data().debts ? doc.data().debts : {};
        if (currentDebts[name]) {
          showMsgDiv("Bu ism bor!", "red");
          return;
        }
        currentDebts[name] = { amount, eggs, eggPrice, phone, eggType, history: [] };
        db.collection('debts').doc(userId).set({ debts: currentDebts }).then(() => {
          document.getElementById('nameInput').value = "";
          document.getElementById('amountInput').value = "";
          document.getElementById('eggInput').value = "";
          document.getElementById('eggPriceInput').value = "";
          document.getElementById('phoneInput').value = "";
          document.getElementById('eggType').selectedIndex = 0; // <-- select uchun to‘g‘ri tozalash
        });
      });
    }

    function displayDebts() {
      const listDiv = document.getElementById('debtList');
      let total = 0;
      for (const data of Object.values(debts)) {
        const eggSum = (data.eggs && data.eggPrice) ? data.eggs * data.eggPrice : 0;
        total += (data.amount || 0) + eggSum;
      }
      document.getElementById('totalDebt').innerHTML = `Jami qarz: <span>${total} so'm</span>`;

      listDiv.innerHTML = "";
      for (const [name, data] of Object.entries(debts)) {
        // Tarixdan tuxumlar va narxlar bo‘yicha umumiy tuxum summasini hisoblash
        let totalEggSum = 0;
        if (data.history && data.history.length) {
          let eggHistory = [];
          for (const item of data.history) {
            if (item.eggs && item.eggPrice) {
              if (item.type === "add") {
                eggHistory.push({ eggs: item.eggs, price: item.eggPrice });
              } else if (item.type === "subtract") {
                // Ayirishda eng oxiridan boshlab tuxumlarni kamaytiramiz
                let toSubtract = item.eggs;
                while (toSubtract > 0 && eggHistory.length > 0) {
                  let last = eggHistory[eggHistory.length - 1];
                  if (last.eggs > toSubtract) {
                    last.eggs -= toSubtract;
                    toSubtract = 0;
                  } else {
                    toSubtract -= last.eggs;
                    eggHistory.pop();
                  }
                }
              }
            }
          }
          // Endi qolgan tuxumlar va narxlar bo‘yicha umumiy summa
          totalEggSum = eggHistory.reduce((sum, e) => sum + (e.eggs * e.price), 0);
        } else {
          totalEggSum = (data.eggs || 0) * (data.eggPrice || 0);
        }
        const personTotal = (data.amount || 0) + totalEggSum;

        // Tarix HTML
        let historyHtml = "";
        if (data.history && data.history.length) {
          historyHtml = `
            <div id="historyDiv-${name}" class="mt-4 p-4 bg-white rounded-xl border-2 border-purple-400 shadow-lg hidden">
              <div class="flex justify-between items-center mb-2">
                <div class="text-lg font-bold text-purple-700">Tarix</div>
                <div class="flex gap-2 items-center">
                  <input id="minusInput-${name}" type="number" placeholder="Jami puldan ayirish" class="border p-1 rounded w-32 text-sm" />
                  <button onclick="minusTotalDebt('${name}')" class="bg-red-500 text-white px-2 py-1 rounded text-sm">Jami minus</button>
                </div>
              </div>
              <div class="grid gap-2">
                ${data.history.slice().reverse().map(item => `
                  <div class="p-3 rounded-xl border ${item.type === "add" ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}">
                    <div class="flex justify-between items-center">
                      <span class="font-semibold">${item.date}</span>
                      <span class="${item.type === "add" ? 'text-green-600' : 'text-red-600'} font-bold">
                        ${item.type === "add" ? "+ Qo‘shildi" : "- Ayirildi"}
                      </span>
                    </div>
                    <div class="mt-1">
                      ${item.amount ? `<div>Pul: <b>${item.amount}</b> so'm</div>` : ""}
                      ${item.eggs ? `<div>Tuxum: <b>${item.eggs}</b> ta</div>` : ""}
                      ${item.eggs ? `<div>Tuxum narxi: <b>${item.eggPrice}</b> so'm</div>` : ""}
                      ${item.eggs ? `<div>Jami tuxum: <b>${item.eggSum}</b> so'm</div>` : ""}
                    </div>
                    <div class="text-xs text-gray-600 mt-1">
                      Qoldi: <b>${item.leftAmount}</b> so'm, <b>${item.leftEggs}</b> ta tuxum, jami: <b>${item.leftEggSum}</b> so'm
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        }

        listDiv.innerHTML += `
          <div class="bg-white border p-4 rounded-xl shadow relative">
            <div class="flex justify-between items-center">
              <h3 class="text-xl font-bold">${name}</h3>
              <button onclick="deleteDebt('${name}')" class="bg-red-500 text-white px-3 py-1 rounded-xl">O‘chirish</button>
            </div>
            <p>Qarzdorlik: <span class="text-blue-600 font-semibold">${data.amount || 0} so'm</span></p>
            <p class="text-yellow-600">Tuxum: <span class="font-semibold">${data.eggs || 0} ta</span></p>
            <p>Jami tuxum summasi: <span class="text-green-700 font-semibold">${totalEggSum} so'm</span></p>
            ${data.eggType ? `<p>Tuxum turi: ${data.eggType}</p>` : ""}
            <p class="font-bold mt-2">Umumiy qarz: <span class="text-purple-700">${personTotal} so'm</span></p>
            ${data.phone ? `<p>📞 ${data.phone}</p>` : ""}
            <div class="flex flex-col sm:flex-row gap-2 mt-2 flex-wrap items-center">
              <button onclick="toggleHistoryDiv('${name}')" class="bg-gray-500 hover:bg-gray-600 transition text-white px-3 py-1 rounded shadow w-full sm:w-auto">Tarix</button>
              <div class="flex flex-col sm:flex-row gap-2 items-center bg-blue-50 border border-blue-200 rounded px-2 py-1 w-full sm:w-auto">
                <input id="addAmount-${name}" type="number" placeholder="Qarzdorlik (so'm)" class="border border-blue-300 focus:ring-2 focus:ring-blue-200 p-1 rounded w-full sm:w-28 text-sm outline-none" />
                <input id="addEggs-${name}" type="number" placeholder="Tuxum soni qo‘shish" class="border border-blue-300 focus:ring-2 focus:ring-blue-200 p-1 rounded w-full sm:w-24 text-sm outline-none" />
                <input id="addEggPrice-${name}" type="number" placeholder="Tuxum narxini qo‘shish" class="border border-blue-300 focus:ring-2 focus:ring-blue-200 p-1 rounded w-full sm:w-24 text-sm outline-none" />
                <button onclick="addToDebt('${name}')" class="bg-green-500 hover:bg-green-600 transition text-white px-3 py-1 rounded shadow text-sm w-full sm:w-auto">Qo‘shish</button>
              </div>
              <div class="flex flex-col sm:flex-row gap-2 items-center bg-red-50 border border-red-200 rounded px-2 py-1 w-full sm:w-auto">
                <input id="minusInput-${name}" type="number" placeholder="Jami puldan ayirish" class="border border-red-300 focus:ring-2 focus:ring-red-200 p-1 rounded w-full sm:w-32 text-sm outline-none" />
                <button onclick="minusTotalDebt('${name}')" class="bg-red-500 hover:bg-red-600 transition text-white px-3 py-1 rounded shadow text-sm w-full sm:w-auto">Ayirish</button>
              </div>
            </div>
            <div id="editDiv-${name}" class="mt-2 hidden">
              ${renderEditDebtForm(name)}
            </div>
            ${historyHtml}
          </div>
        `;
      }
    }

    // Qarzdorni o‘chirish funksiyasi
    function deleteDebt(name) {
      if (confirm(`${name} ni o‘chirishni istaysizmi?`)) {
        delete debts[name];
        saveDebts();
        displayDebts();
      }
    }

    // Qarzni qo‘shish yoki ayirish funksiyasi
    function changeDebt(name, type) {
      const amount = prompt("Qancha pul miqdorini " + (type === "add" ? "qo‘shmoqchisiz" : "ayirmoqchisiz") + "? (so'm)");
      const eggs = prompt("Qancha tuxum sonini " + (type === "add" ? "qo‘shmoqchisiz" : "ayirmoqchisiz") + "? (ta)");
      if (amount === null && eggs === null) return;

      let a = parseFloat(amount) || 0;
      let e = parseInt(eggs) || 0;

      if (type === "add") {
        debts[name].amount = (debts[name].amount || 0) + a;
        debts[name].eggs = (debts[name].eggs || 0) + e;
      } else {
        debts[name].amount = Math.max(0, (debts[name].amount || 0) - a);
        debts[name].eggs = Math.max(0, (debts[name].eggs || 0) - e);
      }
      saveDebts();
      displayDebts();
    }

    // Card ichidagi inputli divni ko‘rsatish/yopish
    function toggleEditDiv(name) {
      const div = document.getElementById(`editDiv-${name}`);
      if (div.classList.contains("hidden")) {
        div.classList.remove("hidden");
      } else {
        div.classList.add("hidden");
      }
    }

    // Input orqali qo‘shish/ayirish
    function changeDebtDiv(name, type) {
      const amount = parseFloat(document.getElementById(`editAmount-${name}`).value) || 0;
      const eggs = parseInt(document.getElementById(`editEggs-${name}`).value) || 0;
      const eggPriceInput = document.getElementById(`editEggPrice-${name}`);
      const changeEggPrice = eggPriceInput && eggPriceInput.value ? parseFloat(eggPriceInput.value) : debts[name].eggPrice || 0;
      const totalSubtractInput = document.getElementById(`editTotalSubtract-${name}`);
      const totalSubtract = totalSubtractInput ? parseFloat(totalSubtractInput.value) || 0 : 0;

      // Faqat jami puldan ayirish logikasi
      if (type === "subtract" && totalSubtract > 0) {
        let oldAmount = debts[name].amount || 0;
        let oldEggs = debts[name].eggs || 0;
        let oldEggPrice = debts[name].eggPrice || 0;
        let oldEggSum = oldEggs * oldEggPrice;
        let oldTotal = oldAmount + oldEggSum;

        let newTotal = Math.max(0, oldTotal - totalSubtract);

        // Avval puldan ayiriladi, keyin tuxumdan
        let newAmount = oldAmount;
        let newEggs = oldEggs;

        if (newTotal >= oldAmount) {
          newAmount = oldAmount;
          let qoldiq = newTotal - oldAmount;
          if (oldEggPrice > 0 && oldEggs > 0) {
            newEggs = Math.floor(qoldiq / oldEggPrice);
            if (newEggs > oldEggs) newEggs = oldEggs;
            if (newEggs < 0) newEggs = 0;
          } else {
            newEggs = 0;
          }
        } else {
          newAmount = newTotal;
          newEggs = oldEggs;
        }

        // Tarixga yozish
        if (!debts[name].history) debts[name].history = [];
        debts[name].history.push({
          type: "subtract",
          amount: oldAmount - newAmount,
          eggs: oldEggs - newEggs,
          eggPrice: oldEggPrice,
          eggSum: (oldEggs - newEggs) * oldEggPrice,
          date: new Date().toLocaleString("uz-UZ"),
          leftAmount: newAmount,
          leftEggs: newEggs,
          leftEggSum: newEggs * oldEggPrice,
          totalSubtract: totalSubtract
        });

        debts[name].amount = newAmount;
        debts[name].eggs = newEggs;
        saveDebts();
        displayDebts();
        setTimeout(() => toggleEditDiv(name), 100);
        return;
      }

      // Oddiy qo‘shish/ayirish logikasi
      if (type === "add" && totalSubtract > 0) {
        showMsgDiv("Jami puldan ayirish faqat 'Ayirish' uchun!", "red");
        return;
      }

      if (amount === 0 && eggs === 0 && !eggPriceInput.value) {
        showMsgDiv("Qiymat kiriting!");
        return;
      }

      if (!debts[name].history) debts[name].history = [];

      // Avvalgi qiymatlar
      let prevAmount = debts[name].amount || 0;
      let prevEggs = debts[name].eggs || 0;
      let prevEggPrice = debts[name].eggPrice || 0;

      // Yangi qiymatlarni hisoblash
      let newAmount = type === "add" ? prevAmount + amount : Math.max(0, prevAmount - amount);
      let newEggs = type === "add" ? prevEggs + eggs : Math.max(0, prevEggs - eggs);

      // Faqat yangi tuxumlar yangi narxda, eski tuxumlar eski narxda qoladi
      let addedEggSum = 0;
      let leftEggSum = 0;
      if (type === "add" && eggs !== 0) {
        addedEggSum = eggs * changeEggPrice;
        leftEggSum = (prevEggs * prevEggPrice) + (eggs * changeEggPrice);
      } else {
        // Ayirish yoki tuxum qo‘shilmagan bo‘lsa
        addedEggSum = eggs * prevEggPrice;
        leftEggSum = newEggs * prevEggPrice;
      }

      // Tarixga yozish
      if (amount !== 0 || eggs !== 0) {
        debts[name].history.push({
          type,
          amount: amount || 0,
          eggs: eggs || 0,
          eggPrice: eggs !== 0 ? changeEggPrice : prevEggPrice,
          eggSum: addedEggSum,
          date: new Date().toLocaleString("uz-UZ"),
          leftAmount: newAmount,
          leftEggs: newEggs,
          leftEggSum: leftEggSum
        });
      }

      debts[name].amount = newAmount;
      debts[name].eggs = newEggs;

      // tuxum narxi faqat yangi tuxum qo‘shilganda yangilanmaydi, eski tuxum narxi o‘zgarmaydi

      // Jami tuxum summasini hisoblash (eski tuxumlar eski narxda, yangi tuxumlar yangi narxda)
      if (type === "add" && eggs !== 0) {
        debts[name].eggSum = (prevEggs * prevEggPrice) + (eggs * changeEggPrice);
      } else {
        debts[name].eggSum = newEggs * prevEggPrice;
      }

      saveDebts();
      displayDebts();
      setTimeout(() => toggleEditDiv(name), 100);
    }

    // Tarix divini ko‘rsatish/yashirish funksiyasi
    function toggleHistoryDiv(name) {
      const div = document.getElementById(`historyDiv-${name}`);
      if (div) {
        div.classList.toggle("hidden");
      }
    }

    function renderEditDebtForm(name) {
      const data = debts[name];
      return `
        <input id="editAmount-${name}" type="number" placeholder="Pul miqdori" class="border p-2 rounded w-full mb-2" />
        <input id="editEggs-${name}" type="number" placeholder="Tuxum soni" class="border p-2 rounded w-full mb-2" />
        <input id="editEggPrice-${name}" type="number" placeholder="Tuxum narxi" class="border p-2 rounded w-full mb-2" />
        <input id="editTotalSubtract-${name}" type="number" placeholder="Jami puldan ayirish" class="border p-2 rounded w-full mb-2" />
        <div class="flex gap-2">
          <button onclick="changeDebtDiv('${name}', 'add')" class="bg-green-500 text-white px-3 py-1 rounded">Qo‘shish</button>
          <button onclick="changeDebtDiv('${name}', 'subtract')" class="bg-red-500 text-white px-3 py-1 rounded">Ayirish</button>
          <button onclick="toggleEditDiv('${name}')" class="bg-gray-500 text-white px-3 py-1 rounded">Yopish</button>
        </div>
      `;
    }

    function minusTotalDebt(name) {
      const input = document.getElementById(`minusInput-${name}`);
      const val = parseFloat(input.value) || 0;
      if (val <= 0) {
        showMsgDiv("To‘g‘ri qiymat kiriting!", "red");
        return;
      }
      // Faqat jami puldan ayirish logikasini ishlatamiz
      const oldAmount = debts[name].amount || 0;
      const oldEggs = debts[name].eggs || 0;
      const oldEggPrice = debts[name].eggPrice || 0;
      const oldEggSum = oldEggs * oldEggPrice;
      const oldTotal = oldAmount + oldEggSum;

      let newTotal = Math.max(0, oldTotal - val);

      // Avval puldan ayiriladi, keyin tuxumdan
      let newAmount = oldAmount;
      let newEggs = oldEggs;

      if (newTotal >= oldAmount) {
        newAmount = oldAmount;
        let qoldiq = newTotal - oldAmount;
        if (oldEggPrice > 0 && oldEggs > 0) {
          newEggs = Math.floor(qoldiq / oldEggPrice);
          if (newEggs > oldEggs) newEggs = oldEggs;
          if (newEggs < 0) newEggs = 0;
        } else {
          newEggs = 0;
        }
      } else {
        newAmount = newTotal;
        newEggs = oldEggs;
      }

      // Tarixga yozish
      if (!debts[name].history) debts[name].history = [];
      debts[name].history.push({
        type: "subtract",
        amount: oldAmount - newAmount,
        eggs: oldEggs - newEggs,
        eggPrice: oldEggPrice,
        eggSum: (oldEggs - newEggs) * oldEggPrice,
        date: new Date().toLocaleString("uz-UZ"),
        leftAmount: newAmount,
        leftEggs: newEggs,
        leftEggSum: newEggs * oldEggPrice,
        totalSubtract: val
      });

      debts[name].amount = newAmount;
      debts[name].eggs = newEggs;
      saveDebts();
      displayDebts();
      setTimeout(() => {
        const div = document.getElementById(`historyDiv-${name}`);
        if (div) div.classList.remove("hidden");
      }, 100);
    }

    function addToDebt(name) {
      const amountInput = document.getElementById(`addAmount-${name}`);
      const eggsInput = document.getElementById(`addEggs-${name}`);
      const eggPriceInput = document.getElementById(`addEggPrice-${name}`);

      const amount = parseFloat(amountInput.value) || 0;
      const eggs = parseInt(eggsInput.value) || 0;
      const eggPrice = parseFloat(eggPriceInput.value) || 0;

      if (amount === 0 && eggs === 0) {
        showMsgDiv("Qiymat kiriting!", "red");
        return;
      }

      // Eski qiymatlar
      let prevAmount = debts[name].amount || 0;
      let prevEggs = debts[name].eggs || 0;
      let prevEggPrice = debts[name].eggPrice || 0;

      // Jami tuxum summasi (barcha tuxumlar uchun)
      // Avvalgi tuxumlar summasi
      let prevEggSum = (prevEggs * prevEggPrice);

      // Yangi tuxum summasi (faqat yangi qo‘shilgan tuxumlar uchun)
      let addedEggSum = eggs * eggPrice;

      // Yangi tuxumlar summasini avvalgi jami tuxum summasiga qo‘shamiz
      let leftEggSum = prevEggSum + addedEggSum;

      // Yangi tuxumlar sonini avvalgi tuxumlar soniga qo‘shamiz
      let newEggs = prevEggs + eggs;

      // Yangi pul qarzi faqat pul inputi bo‘yicha qo‘shiladi
      let newAmount = prevAmount + amount;

      // Tarixga yozish
      if (!debts[name].history) debts[name].history = [];
      debts[name].history.push({
        type: "add",
        amount: amount,
        eggs: eggs,
        eggPrice: eggs !== 0 ? eggPrice : prevEggPrice,
        eggSum: addedEggSum,
        date: new Date().toLocaleString("uz-UZ"),
        leftAmount: newAmount,
        leftEggs: newEggs,
        leftEggSum: leftEggSum
      });

      debts[name].amount = newAmount;
      debts[name].eggs = newEggs;
      if (eggs !== 0) debts[name].eggPrice = eggPrice; // faqat tuxum qo‘shilganda narx yangilanadi

      saveDebts();

      // Inputlarni tozalash
      amountInput.value = "";
      eggsInput.value = "";
      eggPriceInput.value = "";

      displayDebts();
    }

    function searchDebts(query) {
      query = query.trim().toLowerCase();
      const listDiv = document.getElementById('debtList');
      listDiv.innerHTML = "";
      for (const [name, data] of Object.entries(debts)) {
        if (
          name.toLowerCase().includes(query) ||
          (data.phone && data.phone.toLowerCase().includes(query)) ||
          (data.eggType && data.eggType.toLowerCase().includes(query))
        ) {
          // Quyidagi kodni displayDebts() dagidek yozing yoki qisqartiring:
          // Faqat mos kelganlarni chiqaradi
          // ...shu yerda har bir qarzdorni chiqarish uchun displayDebts() dagi HTML kodini ishlating...
          // Masalan:
          // listDiv.innerHTML += `<div> ... </div>`;
          // Yoki displayDebts() funksiyasini moslashtiring
        }
      }
    }

    // HTMLga input qo‘shing (masalan, <input id="searchInput" ... />)
    // va event qo‘shing:
    document.getElementById('searchInput').addEventListener('input', function(e) {
      searchDebts(e.target.value);
    });