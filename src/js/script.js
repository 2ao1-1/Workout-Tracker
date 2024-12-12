"use strict";
/**
 * 1) form element
 * =============================================
 */
const form = document.getElementById("userForm");
const userName = document.getElementById("name");
const userAge = document.getElementById("age");
const userWeight = document.getElementById("weight");
const userHeight = document.getElementById("height");
const userLocation = document.getElementById("location");

// location Elements
const getLocation = document.getElementById("getLocation");
const locationInput = document.getElementById("location");
const locationStatus = document.getElementById("locationStatus");

/**
 * 2) get Location
 * =============================================
 */
getLocation.addEventListener("click", () => {
  if (navigator.geolocation) {
    locationStatus.textContent = "loading...";
    navigator.geolocation.getCurrentPosition((pos) => {
      console.log(pos);
      const { latitude: lat, longitude: lng } = pos.coords;

      locationInput.value = `${lat}, ${lng}`;
      locationStatus.textContent = `Location Determind Successfully!`;
    });
  }
  locationStatus.textContent = `Not Supported Here yet!.`;
});

/**
 * 3)save data
 */
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
// saveData();

/**
 * 2) save user information
 * =============================================
 */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const userData = {
    name: userName.value,
    age: userAge.value,
    weight: userWeight.value,
    height: userHeight.value,
    location: userLocation.value,
  };

  //   store data
  // localStorage.setItem("userData", JSON.stringify(userData));
  saveData("userData", userData);
  alert(`Welcome ${userData.name} \n Data Saved Successfully`);

  //   reset inputs
  userName.value =
    userAge.value =
    userWeight.value =
    userHeight.value =
    userLocation.value =
      "";

  // transfer data
  const queryData = new URLSearchParams(userData).toString();
  //   move to next page
  // window.location.href = `main.html?${queryData}`;
  window.location.href = `main.html?`;
});
