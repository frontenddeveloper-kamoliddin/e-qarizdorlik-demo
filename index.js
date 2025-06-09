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
        const eggSum = (data.eggs && data.eggPrice) ? data.eggs * data.eggPrice : 0;
        const personTotal = (data.amount || 0) + eggSum; // <-- har bir qarzdor uchun alohida total

        // Tarix HTML
        let historyHtml = "";
        if (data.history && data.history.length) {
          historyHtml = `
            <div id="historyDiv-${name}" class="mt-4 p-4 bg-white rounded-xl border-2 border-purple-400 shadow-lg hidden">
              <div class="text-lg font-bold text-purple-700 mb-2">Tarix</div>
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
            <p>Jami tuxum summasi: <span class="text-green-700 font-semibold">${eggSum} so'm</span></p>
            ${data.eggType ? `<p>Tuxum turi: ${data.eggType}</p>` : ""}
            <p class="font-bold mt-2">Umumiy qarz: <span class="text-purple-700">${personTotal} so'm</span></p>
            ${data.phone ? `<p>📞 ${data.phone}</p>` : ""}
            <div class="flex gap-2 mt-2">
              <button onclick="toggleEditDiv('${name}')" class="bg-blue-500 text-white px-2 py-1 rounded">Qarzga o‘zgartirish</button>
              <button onclick="toggleHistoryDiv('${name}')" class="bg-gray-500 text-white px-2 py-1 rounded">Tarix</button>
            </div>
            <div id="editDiv-${name}" class="mt-2 hidden">
              <input id="editAmount-${name}" type="number" placeholder="Pul miqdori" class="border p-2 rounded w-full mb-2" />
              <input id="editEggs-${name}" type="number" placeholder="Tuxum soni" class="border p-2 rounded w-full mb-2" />
              <input id="editEggPrice-${name}" type="number" placeholder="Tuxum narxi" class="border p-2 rounded w-full mb-2" />
              <input id="editTotalSubtract-${name}" type="number" placeholder="Jami puldan ayirish" class="border p-2 rounded w-full mb-2" />
              <div class="flex gap-2">
                <button onclick="changeDebtDiv('${name}', 'add')" class="bg-green-500 text-white px-3 py-1 rounded">Qo‘shish</button>
                <button onclick="changeDebtDiv('${name}', 'subtract')" class="bg-red-500 text-white px-3 py-1 rounded">Ayirish</button>
                <button onclick="toggleEditDiv('${name}')" class="bg-gray-500 text-white px-3 py-1 rounded">Yopish</button>
              </div>
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

      // Jami puldan ayirish faqat 'Ayirish' tugmasi uchun ishlaydi
      if (type === "add" && totalSubtract > 0) {
        showMsgDiv("Jami puldan ayirish faqat 'Ayirish' tugmasi uchun!", "red");
        return;
      }

      if (type === "subtract" && totalSubtract > 0) {
        // Faqat jami qarzdan ayirish
        let oldAmount = debts[name].amount || 0;
        let oldEggs = debts[name].eggs || 0;
        let oldEggPrice = debts[name].eggPrice || 0;
        let oldEggSum = oldEggs * oldEggPrice;
        let oldTotal = oldAmount + oldEggSum;

        let newTotal = Math.max(0, oldTotal - totalSubtract);

        // Pul va tuxumdan proporsional ayirish (avval puldan, keyin tuxumdan)
        let newAmount = oldAmount;
        let newEggs = oldEggs;

        if (newTotal >= oldAmount) {
          newAmount = oldAmount;
          let qoldiq = newTotal - oldAmount;
          if (oldEggPrice > 0) {
            newEggs = Math.floor(qoldiq / oldEggPrice);
            if (newEggs > oldEggs) newEggs = oldEggs;
            if (newEggs < 0) newEggs = 0;
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
        // eggPrice o‘zgarmaydi

        saveDebts();
        displayDebts();
        setTimeout(() => toggleEditDiv(name), 100);
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

      // Tuxum summasini hisoblash (eski tuxumlar eski narxda, yangi tuxumlar yangi narxda)
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
      // tuxum narxi faqat tuxum soni kiritilganda yangilanadi
      if (eggPriceInput && eggPriceInput.value && eggs !== 0) {
        debts[name].eggPrice = changeEggPrice;
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