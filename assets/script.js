document.getElementById("botonSaludo").addEventListener("click", function() {
    const mensaje = document.getElementById("mensaje");
    mensaje.textContent = "¡Hola desde JavaScript! El despliegue con Git funciona.";
    mensaje.style.color = "blue";
});

