// Dependencias
import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });
const API_KEY = process.env.API_KEY;

// Página de Inicio con Formulario de Subida de Imagen y Prompt
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sube tu Imagen de Ultrasonido</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f0f8ff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .container { text-align: center; background-color: #ffffff; border: 2px dashed #0073e6; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); padding: 40px; width: 80%; max-width: 400px; color: #555; }
        h1 { font-size: 20px; color: #0073e6; margin-bottom: 20px; }
        #drop-area { border: 2px dashed #0073e6; padding: 30px; border-radius: 8px; cursor: pointer; background-color: #f9f9f9; }
        #drop-area:hover { background-color: #e6f3ff; }
        .instructions { font-size: 14px; color: #333; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Sube tu Imagen de Ultrasonido</h1>
        <form action="/upload" method="POST" enctype="multipart/form-data" id="upload-form">
          <div id="drop-area">
            <p>Arrastra tu imagen aquí o haz clic para seleccionar</p>
            <input type="file" name="image" id="image" accept=".jpeg, .jpg, .png, .webp" style="display: none;" required />
          </div>
          <div class="instructions">Solo se aceptan imágenes JPEG, PNG o WEBP menores a 5MB.</div>
        </form>
      </div>
      <script>
        const dropArea = document.getElementById("drop-area");
        const fileInput = document.getElementById("image");
        const form = document.getElementById("upload-form");

        dropArea.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", () => { const file = fileInput.files[0]; if (validateFile(file)) form.submit(); });
        dropArea.addEventListener("dragover", (e) => { e.preventDefault(); dropArea.style.backgroundColor = "#e6f3ff"; });
        dropArea.addEventListener("dragleave", () => { dropArea.style.backgroundColor = "#f9f9f9"; });
        dropArea.addEventListener("drop", (e) => { e.preventDefault(); dropArea.style.backgroundColor = "#f9f9f9"; const file = e.dataTransfer.files[0]; if (validateFile(file)) { fileInput.files = e.dataTransfer.files; form.submit(); } });
        function validateFile(file) { const validTypes = ["image/jpeg", "image/png", "image/webp"]; const maxSize = 5 * 1024 * 1024; if (!validTypes.includes(file.type)) { alert("Solo se aceptan archivos JPEG, PNG o WEBP."); return false; } if (file.size > maxSize) { alert("El archivo debe ser menor a 5MB."); return false; } return true; }
      </script>
    </body>
    </html>
  `);
});

// Ruta POST para procesar la imagen y el prompt
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file.path;

    if (!imagePath) {
      throw new Error("No se ha recibido un archivo de imagen válido.");
    }

    const formData = new FormData();
    formData.append("image", fs.createReadStream(imagePath));
    formData.append("prompt", process.env.POSITIVE_PROMPT || "Default positive prompt");
    formData.append("negative_prompt", process.env.NEGATIVE_PROMPT || "Default negative prompt");
    formData.append("output_format", process.env.OUTPUT_FORMAT || "webp");

    const response = await axios.post(
      "https://api.stability.ai/v2beta/stable-image/upscale/creative",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    if (response.status === 200) {
      const generationID = response.data.id;
      res.send(`
        <html>
          <head>
            <meta http-equiv="refresh" content="5;url=/result/${generationID}" />
          </head>
          <body>
            <p>Imagen en proceso de generación con ID: ${generationID}</p>
            <p>Serás redirigido automáticamente en unos segundos. Si no ocurre, <a href="/result/${generationID}">haz clic aquí para ver el resultado</a>.</p>
          </body>
        </html>
      `);
    } else {
      console.error("Error en la generación:", response.data.errors);
      throw new Error(`Error al generar la imagen: ${response.data.errors || response.data}`);
    }
  } catch (error) {
    console.error("Error en la solicitud:", error.response ? error.response.data : error.message);
    res.status(500).send(`Error: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
  } finally {
    if (req.file && req.file.path) fs.unlinkSync(req.file.path); // Borrar el archivo subido
  }
});


// Ruta GET para obtener y mostrar el resultado generado
app.get("/result/:generationID", async (req, res) => {
  const { generationID } = req.params;

  try {
    const response = await axios.get(
      `https://api.stability.ai/v2beta/stable-image/upscale/creative/result/${generationID}`,
      {
        responseType: "arraybuffer",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: "image/*",
        },
      }
    );

    if (response.status === 202) {
      res.send("<p>La generación aún está en proceso. Vuelve a intentarlo en unos segundos.</p>");
    } else if (response.status === 200) {
      const imageBuffer = Buffer.from(response.data, "binary");
      res.writeHead(200, {
        "Content-Type": "image/webp",
        "Content-Length": imageBuffer.length,
      });
      res.end(imageBuffer);
    } else {
      throw new Error(`Error: ${response.status} - ${response.data}`);
    }
  } catch (error) {
    res.status(500).send(`Error al obtener la imagen generada: ${error.message}`);
  }
});

// Iniciar el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
