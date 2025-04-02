document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("dataForm");
    const status = document.getElementById("status");


    function openDatabase() {
        return new Promise((resolve, reject) => {
            let request = indexedDB.open("offlineDB", 1);
            request.onupgradeneeded = (event) => {
                let db = event.target.result;
                if (!db.objectStoreNames.contains("offlineData")) {
                    db.createObjectStore("offlineData", { keyPath: "id", autoIncrement: true });
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }


    function saveDataLocally(data) {
        openDatabase().then(db => {
            let transaction = db.transaction("offlineData", "readwrite");
            let store = transaction.objectStore("offlineData");
            store.add(data);
        });
    }


    function sendData(data) {
        if (navigator.onLine) {
            fetch("http://localhost/localSauve/save.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }).then(response => response.json())
            .then(result => {
                if (result.status === "success") {
                    status.textContent = "Data has been sent successfully!";
                    console.log("Sent:", result);
                } else {
                    throw new Error(result.message);
                }
            }).catch(error => {
                console.error("Sending failed, the data will be saved locally.", error);
                saveDataLocally(data);
                status.textContent = "No connection, the data has been saved locally.";
            });
        } else {
            console.log("No connection, saving locally..");
            saveDataLocally(data);
            status.textContent = "No connection, data has been saved locally.";
        }
    }


window.addEventListener("online", syncData);

function syncData() {
    openDatabase().then(db => {
        let transaction = db.transaction("offlineData", "readonly");
        let store = transaction.objectStore("offlineData");
        let request = store.getAll();
        request.onsuccess = () => {
            let offlineData = request.result;
            if (offlineData.length > 0) {
                offlineData.forEach(data => sendData(data));
                clearOfflineData();
            }
        };
    });
}


    function clearOfflineData() {
        openDatabase().then(db => {
            let transaction = db.transaction("offlineData", "readwrite");
            let store = transaction.objectStore("offlineData");
            store.clear();
        });
    }


    window.addEventListener("online", syncData);


    form.addEventListener("submit", (event) => {
        event.preventDefault();
        let data = {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            message: document.getElementById("message").value,
        };
        sendData(data);
        form.reset();
    });
});