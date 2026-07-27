const teeSheet = document.getElementById("teeSheet");
const dayName = document.getElementById("dayName");
const dateText = document.getElementById("dateText");

const availableCount = document.getElementById("availableCount");
const joinableCount = document.getElementById("joinableCount");
const bookedCount = document.getElementById("bookedCount");

const modal = document.getElementById("bookingModal");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");
const modalTime = document.getElementById("modalTime");
const playerCount = document.getElementById("playerCount");
const playerNames = document.getElementById("playerNames");
const bookingTypeWrap = document.getElementById("bookingTypeWrap");
const confirmBooking = document.getElementById("confirmBooking");

let currentDate = new Date();
let activeFilter = "all";
let selectedTime = null;
let selectedMode = "book";

const MAX_PLAYERS = 4;

function formatDateKey(date) {
    return date.toISOString().split("T")[0];
}

function getBookings() {
    return JSON.parse(localStorage.getItem("teeBookings") || "{}");
}

function saveBookings(bookings) {
    localStorage.setItem("teeBookings", JSON.stringify(bookings));
}

function generateTeeTimes(start = "07:00", end = "18:58", interval = 7) {
    const times = [];
    let [hour, minute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);

    while (hour < endHour || (hour === endHour && minute <= endMinute)) {
        times.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);

        minute += interval;

        if (minute >= 60) {
            hour += Math.floor(minute / 60);
            minute = minute % 60;
        }
    }

    return times;
}

function getSlotStatus(booking) {
    if (!booking) {
        return {
            type: "available",
            label: "🟢 Available",
            button: "Book Now",
            canBook: true
        };
    }

    if (booking.privateGroup) {
        return {
            type: "booked",
            label: "🔴 Booked",
            button: "",
            canBook: false
        };
    }

    const spacesLeft = MAX_PLAYERS - booking.playerCount;

    if (spacesLeft <= 0) {
        return {
            type: "booked",
            label: "🔴 Booked",
            button: "",
            canBook: false
        };
    }

    return {
        type: "joinable",
        label: `🔵 ${spacesLeft} space${spacesLeft === 1 ? "" : "s"} left`,
        button: "Join Group",
        canBook: true
    };
}

function renderDate() {
    const today = new Date();
    const isToday = formatDateKey(today) === formatDateKey(currentDate);

    dayName.textContent = isToday
        ? "Today"
        : currentDate.toLocaleDateString("en-GB", { weekday: "long" });

    dateText.textContent = currentDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function renderTeeSheet() {
    renderDate();

    const bookings = getBookings();
    const dateKey = formatDateKey(currentDate);
    const dayBookings = bookings[dateKey] || {};
    const times = generateTeeTimes();

    teeSheet.innerHTML = "";

    let available = 0;
    let joinable = 0;
    let booked = 0;

    times.forEach(time => {
        const booking = dayBookings[time];
        const status = getSlotStatus(booking);

        if (status.type === "available") available++;
        if (status.type === "joinable") joinable++;
        if (status.type === "booked") booked++;

        if (activeFilter !== "all" && activeFilter !== status.type) {
            return;
        }

        const card = document.createElement("article");
        card.className = "tee-time-card";

        card.innerHTML = `
            <div class="tee-time">${time}</div>
            <div class="status ${status.type}">${status.label}</div>
            ${
                status.canBook
                    ? `<button class="action-btn" data-time="${time}" data-mode="${status.type === "available" ? "book" : "join"}">${status.button}</button>`
                    : `<button class="action-btn" disabled>Booked</button>`
            }
        `;

        teeSheet.appendChild(card);
    });

    availableCount.textContent = available;
    joinableCount.textContent = joinable;
    bookedCount.textContent = booked;

    document.querySelectorAll(".action-btn:not(:disabled)").forEach(button => {
        button.addEventListener("click", () => {
            openBookingModal(button.dataset.time, button.dataset.mode);
        });
    });
}

function openBookingModal(time, mode) {
    selectedTime = time;
    selectedMode = mode;

    modal.classList.remove("hidden");
    modalTitle.textContent = mode === "join" ? "Join Group" : "Book Tee Time";
    modalTime.textContent = time;

    document.getElementById("leadName").value = "";
    document.getElementById("contactNumber").value = "";

    const bookings = getBookings();
    const dateKey = formatDateKey(currentDate);
    const existingBooking = bookings[dateKey]?.[time];

    if (mode === "join" && existingBooking) {
        const spacesLeft = MAX_PLAYERS - existingBooking.playerCount;

        playerCount.innerHTML = "";

        for (let i = 1; i <= spacesLeft; i++) {
            playerCount.innerHTML += `<option value="${i}">${i} player${i === 1 ? "" : "s"}</option>`;
        }

        bookingTypeWrap.style.display = "none";
    } else {
        playerCount.innerHTML = `
            <option value="1">1 player</option>
            <option value="2">2 players</option>
            <option value="3">3 players</option>
            <option value="4">4 players</option>
        `;

        bookingTypeWrap.style.display = "block";
    }

    renderPlayerInputs();
}

function renderPlayerInputs() {
    const count = Number(playerCount.value);
    playerNames.innerHTML = "";

    for (let i = 1; i <= count; i++) {
        const label = document.createElement("label");
        label.innerHTML = `
            Player ${i}
            <input type="text" class="player-name-input" placeholder="Player ${i} name" />
        `;
        playerNames.appendChild(label);
    }
}

function createBookingReference(dateKey, time) {
    const cleanDate = dateKey.replaceAll("-", "").slice(2);
    const cleanTime = time.replace(":", "");
    const random = Math.floor(1000 + Math.random() * 9000);

    return `BGC-${cleanDate}-${cleanTime}-${random}`;
}

confirmBooking.addEventListener("click", () => {
    const leadName = document.getElementById("leadName").value.trim();
    const contactNumber = document.getElementById("contactNumber").value.trim();
    const count = Number(playerCount.value);

    if (!leadName || !contactNumber) {
        alert("Please enter lead booker name and contact number.");
        return;
    }

    const names = [...document.querySelectorAll(".player-name-input")]
        .map(input => input.value.trim())
        .filter(Boolean);

    if (names.length < count) {
        alert("Please enter all player names.");
        return;
    }

    const bookings = getBookings();
    const dateKey = formatDateKey(currentDate);

    if (!bookings[dateKey]) {
        bookings[dateKey] = {};
    }

    const existingBooking = bookings[dateKey][selectedTime];

    if (selectedMode === "join" && existingBooking) {
        existingBooking.playerCount += count;
        existingBooking.players.push(...names);
    } else {
        const bookingType = document.querySelector("input[name='bookingType']:checked").value;

        bookings[dateKey][selectedTime] = {
            reference: createBookingReference(dateKey, selectedTime),
            leadName,
            contactNumber,
            playerCount: count,
            players: names,
            privateGroup: bookingType === "private",
            createdAt: new Date().toISOString()
        };
    }

    saveBookings(bookings);
    modal.classList.add("hidden");
    renderTeeSheet();
});

playerCount.addEventListener("change", renderPlayerInputs);

closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
});

document.getElementById("prevDay").addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 1);
    renderTeeSheet();
});

document.getElementById("nextDay").addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 1);
    renderTeeSheet();
});

document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        activeFilter = button.dataset.filter;
        renderTeeSheet();
    });
});

renderTeeSheet();
