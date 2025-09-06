// Configuración de Pusher
let pusher;
let currentChannel;
let selectedUserId;

// Habilitar logging de Pusher (solo para desarrollo)
Pusher.logToConsole = true;

// Inicializar Pusher con credenciales obtenidas del servidor
function initPusher(token) {
    $.ajax({
        url: 'https://chivimarket.arumasoft.com/api/pusher-credentials',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            pusher = new Pusher(response.appKey, {
                cluster: response.cluster,
                forceTLS: true,
                authEndpoint: '/api/pusher/auth',
                auth: {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                }
            });

            initChat(token);
        },
        error: function(error) {
            console.error('Error al obtener credenciales de Pusher:', error);
        }
    });
}

// Inicializar chat
function initChat(token) {
    // Cargar lista de usuarios
    loadUsers(token);

    // Manejar la selección de un usuario
    $(document).on('click', '.user-list li', function() {
        selectedUserId = $(this).data('id');
        const userName = $(this).text();
        $('.form-header:contains("Chat")').text(`Chat con ${userName}`);

        // Suscribirse al canal privado
        if (currentChannel) {
            pusher.unsubscribe(currentChannel);
        }

        currentChannel = pusher.subscribe(`private-chat.${selectedUserId}`);

        currentChannel.bind('pusher:subscription_succeeded', () => {
            console.log(`Suscripción exitosa al canal private-chat.${selectedUserId}`);
            loadMessages(token, selectedUserId);
        });

        currentChannel.bind('pusher:subscription_error', (status) => {
            console.error('Error en la suscripción:', status);
        });

        currentChannel.bind('message-sent', (data) => {
            appendMessage(data.message, data.user);
        });
    });

    // Manejar el envío de mensajes
    $('#sendMessage').click(function() {
        const message = $('#messageInput').val();
        if (message.trim() === '' || !selectedUserId) return;

        $.ajax({
            url: 'https://chivimarket.arumasoft.com/api/messages',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            data: {
                receiver_id: selectedUserId,
                message: message
            },
            success: function() {
                $('#messageInput').val('');
            },
            error: function(error) {
                alert('Error al enviar el mensaje: ' + (error.responseJSON ? error.responseJSON.message : 'Error desconocido'));
            }
        });
    });
}

// Cargar lista de usuarios
function loadUsers(token) {
    $.ajax({
        url: 'https://chivimarket.arumasoft.com/api/users',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            let html = '';
            response.forEach(user => {
                html += `<li data-id="${user.id}">${user.name}</li>`;
            });
            $('#userList').html(html);
        },
        error: function(xhr, status, error) {
            console.error('Error:', xhr.responseText);
            alert('Error al cargar los usuarios: ' + (xhr.responseJSON && xhr.responseJSON.message ? xhr.responseJSON.message : xhr.statusText));
        }
    });
}

// Cargar mensajes del chat
function loadMessages(token, userId) {
    $.ajax({
        url: `https://chivimarket.arumasoft.com/api/messages/${userId}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function(response) {
            $('#chatMessages').empty();
            response.forEach(message => {
                appendMessage(message.message, message.sender.name);
            });
        },
        error: function(error) {
            alert('Error al cargar los mensajes: ' + (error.responseJSON ? error.responseJSON.message : 'Error desconocido'));
        }
    });
}

// Agregar mensaje al chat
function appendMessage(message, user) {
    $('#chatMessages').append(`<div><strong>${user}:</strong> ${message}</div>`);
    $('#chatMessages').scrollTop($('#chatMessages')[0].scrollHeight);
}

// Mostrar la vista autenticada
function showAuthenticatedView(token) {
    $('#authForms').hide();
    $('#authenticatedSection').show();
    getUserData(token);
    loadNegocios(token);
    //initPusher(token);
}

function initFacebookLogin() {
    if (typeof FB !== 'undefined') {
        loginWithFacebook();
    } else {
        console.error('El SDK de Facebook no está cargado.');
        alert('Error al cargar el inicio de sesión con Facebook. Por favor, inténtalo de nuevo.');
    }
}

function loginWithFacebook() {
    FB.login(function(response) {
        if (response.authResponse) {
            const accessToken = response.authResponse.accessToken;
            $.ajax({
                url: 'https://chivimarket.arumasoft.com/api/login/facebook',
                method: 'POST',
                data: {
                    access_token: accessToken
                },
                success: function(data) {
                    localStorage.setItem('token', data.token);
                    showAuthenticatedView(data.token);
                },
                error: function(error) {
                    alert('Error al autenticar con Facebook: ' + (error.responseJSON ? error.responseJSON.message : 'Error desconocido'));
                }
            });
        } else {
            console.log('El usuario canceló el inicio de sesión o no autorizó la aplicación.');
        }
    }, { scope: 'public_profile,email' });
}

$(document).ready(function() {
    // Capturar el token de la URL si existe (después de autenticación con Google)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    if (tokenFromUrl) {
        // Guardar el token en localStorage
        localStorage.setItem('token', tokenFromUrl);
        // Limpiar la URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Variable para almacenar el token
    let token = localStorage.getItem('token');

    // Si hay un token, mostrar la sección autenticada
    if (token) {
        showAuthenticatedView(token);
    }

    // Manejar el envío del formulario de negocios
    $('#negocioForm').submit(function(e) {
        e.preventDefault();
        const nombre = $('#negocioNombre').val();
        const descripcion = $('#negocioDescripcion').val();
        const direccion = $('#negocioDireccion').val();
        const latitud = $('#negocioLatitud').val();
        const longitud = $('#negocioLongitud').val();
        $.ajax({
            url: 'https://chivimarket.arumasoft.com/api/negocios',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            data: {
                nombre: nombre,
                descripcion: descripcion,
                direccion: direccion,
                latitud: latitud,
                longitud: longitud
            },
            success: function(response) {
                alert('Negocio creado exitosamente.');
                $('#negocioForm')[0].reset();
                $('#negocioFormSection').hide();
                loadNegocios(token);
            },
            error: function(error) {
                alert('Error al crear el negocio: ' + (error.responseJSON ? error.responseJSON.message : 'Error desconocido'));
            }
        });
    });

    // Mostrar/ocultar formulario de negocio
    $('#showNegocioForm').click(function() {
        $('#negocioFormSection').toggle();
    });

    // Manejar el envío del formulario de login
    $('#loginForm').submit(function(e) {
        e.preventDefault();
        const email = $('#loginEmail').val();
        const password = $('#loginPassword').val();
        $.ajax({
            url: 'https://chivimarket.arumasoft.com/api/login',
            method: 'POST',
            data: {
                email: email,
                password: password
            },
            success: function(response) {
                localStorage.setItem('token', response.token);
                showAuthenticatedView(response.token);
            },
            error: function(xhr) {
                alert('Error al iniciar sesión: ' + xhr.responseText);
            }
        });
    });

    // Manejar el envío del formulario de registro
    $('#registerForm').submit(function(e) {
        e.preventDefault();
        const name = $('#registerName').val();
        const email = $('#registerEmail').val();
        const password = $('#registerPassword').val();
        const passwordConfirmation = $('#registerPasswordConfirmation').val();
        $.ajax({
            url: 'https://chivimarket.arumasoft.com/api/register',
            method: 'POST',
            data: {
                name: name,
                email: email,
                password: password,
                'password-confirmation': passwordConfirmation
            },
            success: function(response) {
                alert('Registro exitoso. Ahora puedes iniciar sesión.');
                $('#registerForm')[0].reset();
            },
            error: function(error) {
                alert('Error al registrar: ' + (error.responseJSON ? error.responseJSON.message : 'Error desconocido'));
            }
        });
    });

    // Función para cargar los negocios del usuario
    function loadNegocios(token) {
        $.ajax({
            url: 'https://chivimarket.arumasoft.com/api/mis-negocios',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function(response) {
                let html = '';
                if (response.length > 0) {
                    response.forEach(negocio => {
                        html += `
                            <div class="col-md-6 mb-3">
                                <div class="card negocio-card">
                                    <div class="card-body">
                                        <h5 class="card-title">${negocio.nombre}</h5>
                                        <p class="card-text">${negocio.descripcion}</p>
                                        <p class="card-text"><small class="text-muted">${negocio.direccion}</small></p>
                                        <button class="btn btn-sm btn-outline-primary edit-negocio" data-id="${negocio.id}">Editar</button>
                                        <button class="btn btn-sm btn-outline-danger delete-negocio" data-id="${negocio.id}">Eliminar</button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    html = '<div class="col-12"><p>No tienes negocios registrados.</p></div>';
                }
                $('#negociosList').html(html);
            },
            error: function(error) {
                alert('Error al cargar los negocios: ' + (error.responseJSON ? error.responseJSON.message : 'Error desconocido'));
            }
        });
    }

    // Función para obtener los datos del usuario
    function getUserData(token) {
        $.ajax({
            url: 'https://chivimarket.arumasoft.com/api/user',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            success: function(response) {
                $('#userData').html(`
                    <p><strong>ID:</strong> ${response.id}</p>
                    <p><strong>Nombre:</strong> ${response.name}</p>
                    <p><strong>Email:</strong> ${response.email}</p>
                    <p><strong>Email verificado:</strong> ${response.email_verified_at ? 'Sí' : 'No'}</p>
                    <p><strong>Fecha de creación:</strong> ${new Date(response.created_at).toLocaleString()}</p>
                    <p><strong>Última actualización:</strong> ${new Date(response.updated_at).toLocaleString()}</p>
                `);
            },
            error: function(error) {
                alert('Error al obtener los datos del usuario: ' + (error.responseJSON ? error.responseJSON.message : 'Error desconocido'));
            }
        });
    }

    // Manejar el logout
    $('#logoutButton').click(function() {
        localStorage.removeItem('token');
        token = null;
        $('#authenticatedSection').hide();
        $('#authForms').show();
        $('#negocioFormSection').hide();
        alert('Sesión cerrada correctamente.');
    });
});
