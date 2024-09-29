import axios from "axios";

const apiUrl = import.meta.env.VITE_APP_API_URL;

const instance = axios.create({
  baseURL: apiUrl || "http://localhost:8000/",
});

export default instance;
