"use strict";
/**
 * 1) return Data from LocalStorage
 * - return data
 * - save data
 * _______________________________________________
 */
function getData(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error retrieving data:", error);
    return null;
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

/**
 * 2) User Info
 * _______________________________________________
 */
let userInfo = getData("userData");
if (!userInfo) {
  userInfo = {
    name: "Unknown",
    age: "N/A",
    height: "N/A",
    weight: "N/A",
    image: "assets/icons/user.png",
    workouts: [],
    markers: [],
    location: null,
  };
  saveData("userData", userInfo);
}

/**
 * 3) DOm Element
 * _______________________________________________
 */
const userImg = document.getElementById("user__image");
const uploadImg = document.getElementById("upload__image");
const userName = document.getElementById("user__name");
const userDetails = document.getElementById("user__details");
const userLocation = document.getElementById("user__location");
const editUserInfo = document.getElementById("edit__userInfo");
// weather element
const weatherContent = document.getElementById("weatherContent");

/**
 * 4) Load User Information
 * - update user info
 * _______________________________________________
 */
console.log(userInfo);
const loadUserInfo = function () {
  userName.textContent = userInfo.name;
  userDetails.textContent = `Age: ${userInfo.age} | Height: ${userInfo.height}cm | Weight: ${userInfo.weight}kg`;
  userImg.src = userInfo.image || "assets/icons/user.png";
};

/**
 * 5) Upload Profile Image
 * - update img
 * - show new img
 * - save data
 * _______________________________________________
 */
uploadImg.addEventListener("change", (e) => {
  const file = e.target.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (userInfo) {
        userInfo.image = e.target.result;
        userImg.src = e.target.result;
        saveData("userData", userInfo);
      }
    };
    reader.readAsDataURL(file);
  }
});

/**
 * 6) edit user info
 * - edit data
 * - return data if user has no edit
 * - save data
 * _______________________________________________
 */
editUserInfo.addEventListener("click", () => {
  const name = prompt("Enter your name:", userInfo.name);
  const age = prompt("Enter your age:", userInfo.age);
  const height = prompt("Enter your height (cm):", userInfo.height);
  const weight = prompt("Enter your weight (kg):", userInfo.weight);

  if (name) userInfo.name = name;
  if (age) userInfo.age = age;
  if (height) userInfo.height = height;
  if (weight) userInfo.weight = weight;

  loadUserInfo();
  saveData("userData", userInfo);
});
loadUserInfo();

/**
 * 7) Weather : show user weather
 * _______________________________________________
 */
// init location
let lat, lng;

function getWeather(position) {
  const coords = position.split(",", 2);
  lat = coords[0].trim();
  lng = coords[1].trim();

  // Weather API
  fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=50d4aa487c253b5d7d9e00b0dd13d341`
  )
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      const tempreture = Math.round(data.main.temp);
      const weather = data.weather[0].description;
      const icon = data.weather[0].icon;
      weatherContent.innerHTML = `
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="Weather Icon" class="w-24 h-24 mb-1">
      <div class="text-main">
      <p class="text-xl font-bold">${tempreture}°C</p>
      <p class="text-gray-600 capitalize">${weather}</p>
      </div>
      `;
    })
    .catch((error) => {
      console.error("Error fetching weather data:", error);
      weatherContent.innerHTML = `<p class="text-red-500">Unable to fetch weather data.</p>`;
    });
}

// get weather
if (userInfo && userInfo.location) {
  getWeather(userInfo.location);
}

/**
 * 8) Map
 * _______________________________________________
 */
const map = L.map("map").setView([lat, lng], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

/**
 * 9) Global Variables and Utilities
 * - init data storage
 * - Calculate distance between two points
 * - calc calories
 * _______________________________________________
 */
let markers = [];
let workouts = getData("workouts") || [];
let trackPoints = [];
let tracking = false;
let trackingPolyline;

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calcCalories(type, distance, time) {
  const calorieRates = {
    running: 1.036,
    cycling: 0.3,
  };
  return Math.round(distance * calorieRates[type] * (time / 60));
}

/**
 * 10) sidebar & form
 * _______________________________________________
 */
// sidebar elements
const sidebar = document.getElementById("sidebar");
const formContainer = document.createElement("div");
formContainer.id = "form-container";
sidebar.appendChild(formContainer);

/**
 * 10) save & load workout
 * - save workouts
 * - Load workouts
 * _______________________________________________
 */
//
function saveWorkoutsToLocalStorage() {
  const cleanWorkouts = workouts.map((workout) => {
    const { marker, ...rest } = workout;
    return rest;
  });
  saveData("workouts", cleanWorkouts);
}
function loadWorkoutsFromLocalStorage() {
  const savedWorkouts = getData("workouts");
  if (savedWorkouts) {
    workouts = savedWorkouts;
    renderWorkoutList();
    recreateWorkoutMarkers();
  }
}

/**
 * 11) Create marker for a workout
 * - Create Workout Marker
 * - Recreate markers for saved workouts
 * - load markers
 * _______________________________________________
 */
function createWorkoutMarker(workout) {
  const { lat, lng } = workout.lastClickedLocation || {
    lat: 30.0444,
    lng: 31.2357,
  };

  const marker = L.marker([lat, lng]).addTo(map).bindPopup(`
    <strong>${
      workout.type[0].toUpperCase() + workout.type.slice(1)
    } Workout</strong>
    <br>🗺 Distance: ${workout.distance} km
    <br>⏳ Time: ${workout.time} min
    <br>⚡ Speed: ${workout.speed} km/h
    <br>🔥 Calories: ${workout.calories} cal
  `);
  return marker;
}

function recreateWorkoutMarkers() {
  workouts.forEach((workout) => {
    workout.marker = createWorkoutMarker(workout);
  });
}
function loadMarkersFromLocalStorage() {
  const savedMarkers = getData("savedMarkers");
  if (savedMarkers && savedMarkers.length > 0) {
    savedMarkers.forEach((markerData) => {
      const marker = L.marker([lat, lng]).addTo(map).bindPopup(`
        <strong>${
          workout.type[0].toUpperCase() + workout.type.slice(1)
        } Workout</strong>
        <br>🗺 Distance: ${workout.distance} km
        <br>⏳ Time: ${workout.time} min
        <br>⚡ Speed: ${workout.speed} km/h
        <br>🔥 Calories: ${workout.calories} cal
      `);

      markers.push({
        ...markerData,
        marker: marker,
      });
    });
  }
}

/**
 * 12) Add Event to Map
 * _______________________________________________
 */
map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  window.currentClickLocation = { lat, lng };
  createForm();
});

/**
 * 13) Create form
 * - Workout Form
 * - Get form values
 * - Create workout object
 * - Add workout marker
 * - Add to workouts array
 * - Save to localStorage
 * - Render updated list
 * - Reset form
 * _______________________________________________
 */
function createForm() {
  formContainer.innerHTML = `
  <form
  id="workout-form"
  class="bg-main/50 rounded-lg p-4 text-xs grid grid-cols-4"
  >
  <div class="col-span-4 flex justify-center items-center mb-5">
  <label for="type" class="">Activity Type:</label>
  <select
  id="type"
              class="bg-main/25 rounded-lg py-1 px-2"
              required
            >
              <option value="running">Running</option>
              <option value="cycling">Cycling</option>
            </select>
          </div>
          <div class="col-span-2 grid grid-cols-2 justify-around items-center">
          <label for="distance" class="col-span-1">Distance:</label>
          <input
          type="number"
              placeholder="km"
              id="distance"
              class="col-span-1 px-2 rounded-md text-main"
              required
            />
          </div>
          <div class="col-span-2 grid grid-cols-2 justify-around items-center">
             <label for="time">Time:</label>
            <input
             type="number"
              placeholder="min"
              class="col-span-1 px-2 rounded-md text-main"
              id="time"
              required
            />
          </div>

          <button
            type="submit"
            class="col-start-2 col-span-2 bg-main rounded-lg p-1 mt-5 text-white"
          >
            Add Activity
          </button>
        </form>
  `;

  const form = document.getElementById("workout-form");
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const type = document.getElementById("type").value;
    const distance = (parseFloat(document.getElementById("distance").value)).toFixed(1);
    const time = parseFloat(document.getElementById("time").value);
    const speed = (distance / (time / 60)).toFixed(2);
    const calories = calcCalories(type, distance, time);
    const date = new Date().toLocaleDateString();

    const workout = {
      type,
      distance,
      time,
      speed,
      calories,
      date,
      lastClickedLocation: window.currentClickLocation || {
        lat: 30.0444,
        lng: 31.2357,
      },
    };

    workout.marker = createWorkoutMarker(workout);
    workouts.unshift(workout);
    saveWorkoutsToLocalStorage();
    renderWorkoutList();
    formContainer.innerHTML = "";
  });
}

/**
 * 14) Sidebar
 * - render list
 * - clear list
 * - add list item
 * - Delete workout
 * -- Remove marker
 * -- Remove from workouts array
 * -- Update localStorage and re-render
 * - Edit workout
 * -- Update workout data
 * -- Update marker
 * - Click to focus map
 * _______________________________________________
 */
function renderWorkoutList() {
  const workoutList = document.getElementById("workout-list");
  sidebar.appendChild(workoutList);
  if (!workoutList) return;

  workoutList.innerHTML = "";

  workouts.forEach((workout, index) => {
    const listItem = document.createElement("li");
    listItem.className = `item grid grid-cols-4 items-center text-center bg-main/20 rounded-lg text-main workout--${workout.type}`;

    listItem.innerHTML = `
          <span class="block col-span-2 py-2">${
            workout.type.charAt(0).toUpperCase() + workout.type.slice(1)
          } on ${workout.date}</span>
          <span class="block col-span-2 py-2 px-4 text-end">
              <button class="edit-workout bg-main rounded-md p-1 mr-1">
                  <img src="../../assets/icons/edit.png" width="16" height="16" alt="edit"/>
              </button>
              <button class="delete-workout bg-main rounded-md p-1">
                  <img src="../../assets/icons/delete.png" width="16" height="16" alt="delete"/>
              </button>
          </span>
          <span class="col-span-2 text-xs md:text-base mb-4">🗺 Distance: ${
            workout.distance
          } km</span>
          <span class="col-span-2 text-xs md:text-base mb-4">🕐 Time: ${
            workout.time
          } min</span>
          <span class="col-span-2 text-xs md:text-base mb-4">⚡ Speed: ${workout.speed} km/h</span>
          <span class="col-span-2 text-xs md:text-base mb-4">🔥 Calories: ${
            workout.calories
          } cal</span>
      `;

    const deleteButton = listItem.querySelector(".delete-workout");
    deleteButton.addEventListener("click", () => {
      if (workout.marker) {
        map.removeLayer(workout.marker);
      }
      workouts.splice(index, 1);
      saveWorkoutsToLocalStorage();
      renderWorkoutList();
    });

    const editButton = listItem.querySelector(".edit-workout");
    editButton.addEventListener("click", () => {
      const type = prompt(
        "Enter activity type (running/cycling):",
        workout.type
      );
      const distance = parseFloat(
        prompt("Enter distance (km):", workout.distance)
      );
      const time = parseFloat(prompt("Enter time (min):", workout.time));
      const speed = distance / (time / 60);
      const calories = calcCalories(type, distance, time);

      if (type) workout.type = type;
      if (distance) workout.distance = distance;
      if (time) workout.time = time;
      workout.speed = speed;
      workout.calories = calories;

      if (workout.marker) {
        map.removeLayer(workout.marker);
      }
      workout.marker = createWorkoutMarker(workout);

      saveWorkoutsToLocalStorage();
      renderWorkoutList();
    });

    listItem.addEventListener("click", () => {
      if (workout.marker) {
        map.setView(
          [workout.marker._latlng.lat, workout.marker._latlng.lng],
          18,
          { animate: true, duration: 0 }
        );
        workout.marker.openPopup();
      }
    });

    workoutList.appendChild(listItem);
  });
}

/**
 * 15) Start Tracking
 * _______________________________________________
 */
function startTracking() {
  if (tracking) return;

  tracking = true;
  trackPoints = [];
  trackingPolyline = L.polyline([], { color: "red" }).addTo(map);

  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const currentPoint = [latitude, longitude];

      trackPoints.push(currentPoint);
      trackingPolyline.setLatLngs(trackPoints);
      map.setView(currentPoint, 16);
    },
    (error) => {
      console.error("Location tracking error:", error);
      tracking = false;
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000,
    }
  );

  trackBtn.textContent = "Stop Tracking";
  localStorage.setItem("trackingStarted", "true");
}

/**
 * 16) stop tracking
 * _______________________________________________
 */
function stopTracking() {
  if (!tracking) return;

  tracking = false;

  let totalDistance = 0;
  for (let i = 1; i < trackPoints.length; i++) {
    totalDistance += calcDistance(
      trackPoints[i - 1][0],
      trackPoints[i - 1][1],
      trackPoints[i][0],
      trackPoints[i][1]
    );
  }

  if (trackPoints.length > 0) {
    const workout = {
      type: "running",
      distance: totalDistance,
      time: trackPoints.length * 0.5,
      speed: totalDistance / ((trackPoints.length * 0.5) / 60),
      calories: calcCalories(
        "running",
        totalDistance,
        trackPoints.length * 0.5
      ),
      date: new Date().toLocaleDateString(),
      lastClickedLocation: {
        lat: trackPoints[trackPoints.length - 1][0],
        lng: trackPoints[trackPoints.length - 1][1],
      },
    };

    workouts.unshift(workout);
    saveWorkoutsToLocalStorage();
    renderWorkoutList();
    const midIndex = Math.floor(trackPoints.length / 2);
    const midPoint = trackPoints[midIndex];

    const marker = L.marker([midIndex.lat, midIndex.lng])
      .addTo(map)
      .bindPopup(`Total Distance: ${totalDistance} km`)
      .openPopup();

    const markerData = {
      title: "Tracking Path",
      lat: midPoint.lat,
      lng: midPoint.lng,
      distance: totalDistance,
    };
    markers.unshift({ ...markerData, marker });
    // Save to localStorage
    saveMarkersToLocalStorage();

    // Save track points
    localStorage.setItem("trackPoints", JSON.stringify(trackPoints));

    updateSidebar();
  }
  // Remove tracking flag
  saveMarkersToLocalStorage();
  localStorage.removeItem("trackingStarted");

  alert("Tracking stopped.");
}

/**
 * 17) trackingBtn
 * _______________________________________________
 */
const mapContainer = document.getElementById("mapContainer");
const trackBtn = document.createElement("button");
trackBtn.textContent = "Start Tracking";
trackBtn.className =
  "absolute top-4 right-4 bg-main/50 text-white p-2 rounded z-10 text-xxs";
trackBtn.addEventListener("click", () => {
  if (tracking) {
    stopTracking();
    trackBtn.textContent = "Start Tracking";
  } else {
    startTracking();
    trackBtn.textContent = "Stop Tracking";
  }
});
mapContainer.appendChild(trackBtn);

/**
 * 18) loading ....
 * - Load saved workouts
 * - Display workouts in the sidebar
 * - Load and recreate markers
 * __________________________________________________
 */
document.addEventListener("DOMContentLoaded", () => {
  loadWorkoutsFromLocalStorage();
  renderWorkoutList();
  loadMarkersFromLocalStorage();
});
