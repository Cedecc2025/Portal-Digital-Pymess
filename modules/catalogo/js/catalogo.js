// App State
let appData = {
    settings: {
        businessName: 'Mi Negocio',
        whatsapp: '',
        email: '',
        password: 'admin123',
        logo: '',
        colors: {
            primary: '#2563eb',
            bgColor1: '#667eea',
            bgColor2: '#764ba2'
        },
        notifications: {
            sound: true,
            browser: false
        }
    },
    chatbot: {
        enabled: true,
        name: 'Asistente Virtual',
        welcome: '¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
        faqs: [],
        quickResponses: {
            horario: 'Nuestro horario de atención es de Lunes a Viernes.',
            entrega: 'Los tiempos de entrega son de 24-48 horas.',
            pago: 'Aceptamos: Efectivo, SINPE Móvil, Transferencia.',
            contacto: ''
        }
    },
    products: [],
    clients: [],
    sales: [],
    cart: [],
    notifications: []
};

let isAdmin = false;
let currentFilter = 'all';
let editingProductId = null;
let lastSaleData = null;
let parsedWhatsAppData = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Check if it's first time setup
    if (!localStorage.getItem('pymeSystemInitialized')) {
        // First time - start completely fresh
        localStorage.setItem('pymeSystemInitialized', 'true');
        saveData();
        showNotification('🎉 Sistema listo - Configura tu negocio en ⚙️ Config', 'info');
    } else {
        // Load existing data
        loadData();
    }
    
    loadProducts();
    updateCartBadge();
    initializeChatbot();
    updateNotificationBadge();
    
    // Show welcome message if no products
    if (appData.products.length === 0 && !sessionStorage.getItem('welcomeShown')) {
        setTimeout(() => {
            showNotification('👋 Para configurar el sistema, haz click en el candado 🔒', 'info');
            sessionStorage.setItem('welcomeShown', 'true');
        }, 1000);
    }
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function(e) {
        searchProducts(e.target.value);
    });
    
    // Color picker sync
    document.getElementById('primaryColor').addEventListener('change', function() {
        document.getElementById('primaryColorHex').value = this.value;
    });
    
    // Initialize notification preferences
    if (appData.settings.notifications) {
        document.getElementById('notificationSound').checked = appData.settings.notifications.sound !== false;
        document.getElementById('browserNotifications').checked = appData.settings.notifications.browser === true;
    }
    
    // Save notification preferences on change
    document.getElementById('notificationSound').addEventListener('change', function() {
        if (!appData.settings.notifications) {
            appData.settings.notifications = {};
        }
        appData.settings.notifications.sound = this.checked;
        saveData();
    });
    
    // Close notification dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('notificationDropdown');
        const button = e.target.closest('#notificationBtn');
        if (!dropdown.contains(e.target) && !button) {
            dropdown.classList.remove('show');
        }
    });
    
    // Set lock title
    document.getElementById('adminLock').title = 'Click para iniciar sesión';
});

// WhatsApp Message Parser Functions
function parseWhatsAppMessage() {
    const message = document.getElementById('whatsappMessageInput').value.trim();
    
    if (!message) {
        showProcessStatus('Por favor pega un mensaje de WhatsApp', 'warning');
        return;
    }
    
    try {
        // Parse the WhatsApp message
        const data = extractWhatsAppData(message);
        
        if (!data) {
            showProcessStatus('No se pudo interpretar el mensaje. Verifica el formato.', 'error');
            return;
        }
        
        // Store parsed data
        parsedWhatsAppData = data;
        
        // Display parsed data
        displayParsedData(data);
        
        showProcessStatus('Mensaje analizado correctamente. Revisa los datos y confirma el procesamiento.', 'success');
        
    } catch (error) {
        console.error('Error parsing WhatsApp message:', error);
        showProcessStatus('Error al procesar el mensaje: ' + error.message, 'error');
    }
}

function extractWhatsAppData(message) {
    const data = {
        client: {},
        products: [],
        subtotal: 0,
        tax: 0,
        total: 0
    };
    
    // Clean the message
    const lines = message.split('\n').map(line => line.trim());
    
    // Extract client name
    const clientLine = lines.find(line => line.toLowerCase().includes('cliente:'));
    if (clientLine) {
        data.client.name = clientLine.split(':')[1].trim();
    }
    
    // Extract phone
    const phoneLine = lines.find(line => line.toLowerCase().includes('teléfono:') || line.toLowerCase().includes('telefono:'));
    if (phoneLine) {
        data.client.phone = phoneLine.split(':')[1].trim().replace(/\D/g, '');
    }
    
    // Extract address if present
    const addressLine = lines.find(line => line.toLowerCase().includes('dirección:') || line.toLowerCase().includes('direccion:'));
    if (addressLine) {
        data.client.address = addressLine.split(':')[1].trim();
    }
    
    // Extract products
    let inProductSection = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if we're in the products section
        if (line.includes('Productos:') || line.includes('PRODUCTOS:')) {
            inProductSection = true;
            continue;
        }
        
        // Check if we've left the products section
        if (inProductSection && (line.includes('Subtotal:') || line.includes('SUBTOTAL:'))) {
            inProductSection = false;
        }
        
        // Parse product lines
        if (inProductSection && line.startsWith('•')) {
            const productData = parseProductLine(line);
            if (productData) {
                data.products.push(productData);
            }
        }
    }
    
    // Extract totals
    const subtotalLine = lines.find(line => line.toLowerCase().includes('subtotal:'));
    if (subtotalLine) {
        data.subtotal = extractAmount(subtotalLine);
    }
    
    const taxLine = lines.find(line => line.toLowerCase().includes('iva'));
    if (taxLine) {
        data.tax = extractAmount(taxLine);
    }
    
    const totalLine = lines.find(line => line.toLowerCase().includes('total:'));
    if (totalLine) {
        // Get the last occurrence of TOTAL (in case there's subtotal and total)
        const totalLines = lines.filter(line => line.toLowerCase().includes('total:'));
        const finalTotalLine = totalLines[totalLines.length - 1];
        data.total = extractAmount(finalTotalLine);
    }
    
    // Validate data
    if (!data.client.name || !data.client.phone || data.products.length === 0) {
        throw new Error('Faltan datos importantes (cliente, teléfono o productos)');
    }
    
    return data;
}

function parseProductLine(line) {
    // Remove bullet point
    let productText = line.replace('•', '').trim();
    
    // Try to match pattern: Product xQuantity = Price
    const match = productText.match(/(.+?)\s*x\s*(\d+)\s*=\s*₡?([\d,]+)/);
    
    if (match) {
        return {
            name: match[1].trim(),
            quantity: parseInt(match[2]),
            total: parseInt(match[3].replace(/,/g, ''))
        };
    }
    
    // Alternative pattern: Product (Quantity) - Price
    const altMatch = productText.match(/(.+?)\s*\((\d+)\)\s*[-–]\s*₡?([\d,]+)/);
    
    if (altMatch) {
        return {
            name: altMatch[1].trim(),
            quantity: parseInt(altMatch[2]),
            total: parseInt(altMatch[3].replace(/,/g, ''))
        };
    }
    
    return null;
}

function extractAmount(line) {
    const match = line.match(/₡?([\d,]+)/);
    if (match) {
        return parseInt(match[1].replace(/,/g, ''));
    }
    return 0;
}

function displayParsedData(data) {
    const container = document.getElementById('parsedData');
    
    let html = `
        <h4 style="margin-bottom: 15px;">📋 Datos Detectados:</h4>
        
        <div class="parsed-item">
            <span class="parsed-label">Cliente:</span>
            <span class="parsed-value">${data.client.name}</span>
        </div>
        
        <div class="parsed-item">
            <span class="parsed-label">Teléfono:</span>
            <span class="parsed-value">${data.client.phone}</span>
        </div>
    `;
    
    if (data.client.address) {
        html += `
            <div class="parsed-item">
                <span class="parsed-label">Dirección:</span>
                <span class="parsed-value">${data.client.address}</span>
            </div>
        `;
    }
    
    html += `
        <h4 style="margin: 15px 0;">📦 Productos:</h4>
        <div class="parsed-products">
    `;
    
    data.products.forEach(product => {
        const existingProduct = findProductByName(product.name);
        const matchStatus = existingProduct ? 
            '<span class="product-match found">✓ Encontrado</span>' : 
            '<span class="product-match not-found">⚠ No encontrado</span>';
        
        html += `
            <div class="parsed-product-item">
                <span>${product.name} x${product.quantity} ${matchStatus}</span>
                <span>₡${product.total.toLocaleString()}</span>
            </div>
        `;
    });
    
    html += `
        </div>
        
        <div class="parsed-item">
            <span class="parsed-label">Subtotal:</span>
            <span class="parsed-value">₡${data.subtotal.toLocaleString()}</span>
        </div>
        
        <div class="parsed-item">
            <span class="parsed-label">IVA (13%):</span>
            <span class="parsed-value">₡${data.tax.toLocaleString()}</span>
        </div>
        
        <div class="parsed-item" style="font-size: 18px; font-weight: bold; color: var(--primary);">
            <span class="parsed-label">TOTAL:</span>
            <span class="parsed-value">₡${data.total.toLocaleString()}</span>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 10px;">
            <button class="btn-primary btn-success" onclick="confirmWhatsAppProcess()">
                ✅ Confirmar y Procesar
            </button>
            <button class="btn-primary btn-warning" onclick="editParsedData()">
                ✏️ Editar Datos
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    container.classList.add('show');
}

function findProductByName(name) {
    // Clean and normalize the name for comparison
    const cleanName = name.toLowerCase().trim();
    
    return appData.products.find(product => {
        const productName = product.name.toLowerCase().trim();
        // Exact match or partial match
        return productName === cleanName || 
               productName.includes(cleanName) || 
               cleanName.includes(productName);
    });
}

function confirmWhatsAppProcess() {
    if (!parsedWhatsAppData) {
        showProcessStatus('No hay datos para procesar', 'error');
        return;
    }
    
    try {
        // Create sale record
        const sale = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            client: parsedWhatsAppData.client,
            items: [],
            subtotal: parsedWhatsAppData.subtotal,
            tax: parsedWhatsAppData.tax,
            total: parsedWhatsAppData.total,
            status: 'Pendiente',
            source: 'WhatsApp Manual'
        };
        
        // Process each product
        let allProductsFound = true;
        parsedWhatsAppData.products.forEach(item => {
            const product = findProductByName(item.name);
            
            if (product) {
                // Update inventory
                if (product.stock >= item.quantity) {
                    product.stock -= item.quantity;
                } else {
                    showNotification(`⚠️ Stock insuficiente para ${product.name}`, 'warning');
                }
                
                // Add to sale items
                sale.items.push({
                    name: product.name,
                    price: Math.round(item.total / item.quantity),
                    quantity: item.quantity,
                    total: item.total
                });
            } else {
                // Product not found, create a temporary entry
                allProductsFound = false;
                sale.items.push({
                    name: item.name,
                    price: Math.round(item.total / item.quantity),
                    quantity: item.quantity,
                    total: item.total,
                    notFound: true
                });
            }
        });
        
        // Save sale
        appData.sales.push(sale);
        
        // Update or create client
        let client = appData.clients.find(c => c.phone === parsedWhatsAppData.client.phone);
        if (client) {
            client.purchases++;
            client.totalSpent += sale.total;
            if (parsedWhatsAppData.client.address && !client.address) {
                client.address = parsedWhatsAppData.client.address;
            }
        } else {
            appData.clients.push({
                name: parsedWhatsAppData.client.name,
                phone: parsedWhatsAppData.client.phone,
                address: parsedWhatsAppData.client.address || '',
                purchases: 1,
                totalSpent: sale.total
            });
        }
        
        // Create notification
        createPurchaseNotification({
            clientName: parsedWhatsAppData.client.name,
            clientPhone: parsedWhatsAppData.client.phone,
            items: parsedWhatsAppData.products.length,
            total: sale.total,
            saleId: sale.id,
            source: 'WhatsApp Manual'
        });
        
        // Save all changes
        saveData();
        
        // Update UI
        loadProducts();
        loadSales();
        loadClients();
        loadInventory();
        updateDashboard();
        
        // Clear processor
        clearWhatsAppProcessor();
        
        // Show success message
        if (allProductsFound) {
            showNotification('✅ Pedido procesado exitosamente', 'success');
        } else {
            showNotification('⚠️ Pedido procesado. Algunos productos no se encontraron en el inventario.', 'warning');
        }
        
        // Show the sale
        showSection('sales', document.querySelector('.nav-tab:nth-child(3)'));
        
    } catch (error) {
        console.error('Error processing WhatsApp order:', error);
        showProcessStatus('Error al procesar el pedido: ' + error.message, 'error');
    }
}

function editParsedData() {
    // This would open a modal to edit the parsed data
    // For now, we'll just show a message
    showNotification('Función de edición en desarrollo. Por ahora, corrige el mensaje y vuelve a analizarlo.', 'info');
}

function clearWhatsAppProcessor() {
    document.getElementById('whatsappMessageInput').value = '';
    document.getElementById('parsedData').innerHTML = '';
    document.getElementById('parsedData').classList.remove('show');
    document.getElementById('processStatus').style.display = 'none';
    parsedWhatsAppData = null;
}

function showProcessStatus(message, type) {
    const statusElement = document.getElementById('processStatus');
    statusElement.className = `process-status ${type}`;
    statusElement.innerHTML = message;
    statusElement.style.display = 'block';
    
    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
}

function processWhatsAppFromModal() {
    const message = document.getElementById('modalWhatsappInput').value.trim();
    
    if (!message) {
        showNotification('Por favor pega un mensaje de WhatsApp', 'warning');
        return;
    }
    
    // Copy message to main processor
    document.getElementById('whatsappMessageInput').value = message;
    
    // Close modal
    closeModal('whatsappProcessModal');
    
    // Go to sales section
    showSection('sales', document.querySelector('.nav-tab:nth-child(3)'));
    
    // Process the message
    setTimeout(() => {
        parseWhatsAppMessage();
    }, 300);
}

// Data Management
function loadData() {
    const saved = localStorage.getItem('pymeSystemData');
    if (saved) {
        appData = JSON.parse(saved);
        
        // Initialize notifications array if it doesn't exist
        if (!appData.notifications) {
            appData.notifications = [];
        }
        
        // Initialize notification settings if they don't exist
        if (!appData.settings.notifications) {
            appData.settings.notifications = {
                sound: true,
                browser: false
            };
        }
        
        // Apply saved colors
        if (appData.settings.colors) {
            applyColors();
        }
        
        // Apply saved logo
        if (appData.settings.logo) {
            updateLogo();
        }
    }
    
    // Update UI with settings
    document.getElementById('businessName').textContent = appData.settings.businessName;
    document.getElementById('settingsBusinessName').value = appData.settings.businessName;
    document.getElementById('settingsWhatsApp').value = appData.settings.whatsapp || '';
    document.getElementById('settingsEmail').value = appData.settings.email || '';
    
    if (appData.settings.logo) {
        document.getElementById('settingsLogoUrl').value = appData.settings.logo;
        document.getElementById('logoPreview').innerHTML = `<img src="${appData.settings.logo}" style="max-height: 100px; border-radius: 8px;">`;
        document.getElementById('removeLogoBtn').style.display = 'inline-block';
    }
    
    if (appData.settings.colors) {
        document.getElementById('primaryColor').value = appData.settings.colors.primary;
        document.getElementById('primaryColorHex').value = appData.settings.colors.primary;
        document.getElementById('bgColor1').value = appData.settings.colors.bgColor1;
        document.getElementById('bgColor2').value = appData.settings.colors.bgColor2;
    }
}

function saveData() {
    localStorage.setItem('pymeSystemData', JSON.stringify(appData));
}

function factoryReset() {
    const confirmMessage = '⚠️ REINICIO TOTAL DE FÁBRICA ⚠️\n\n' +
        'Esto eliminará PERMANENTEMENTE:\n' +
        '• Todos los productos\n' +
        '• Todos los clientes\n' +
        '• Todas las ventas\n' +
        '• Todas las notificaciones\n' +
        '• Toda la configuración\n\n' +
        '¿Estás COMPLETAMENTE SEGURO?\n\n' +
        'Escribe "REINICIAR" para confirmar:';
    
    const confirmation = prompt(confirmMessage);
    
    if (confirmation === 'REINICIAR') {
        // Clear everything
        localStorage.clear();
        
        alert('✅ Sistema reiniciado completamente.\n\nAhora está listo para una nueva empresa.');
        
        location.reload();
    } else if (confirmation !== null) {
        alert('Reinicio cancelado. No se realizaron cambios.');
    }
}

// Logo Management
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            appData.settings.logo = e.target.result;
            document.getElementById('settingsLogoUrl').value = e.target.result;
            document.getElementById('logoPreview').innerHTML = `<img src="${e.target.result}" style="max-height: 100px; border-radius: 8px;">`;
            document.getElementById('removeLogoBtn').style.display = 'inline-block';
            updateLogo();
            saveData();
            showNotification('Logo cargado exitosamente', 'success');
        };
        reader.readAsDataURL(file);
    }
}

function updateLogo() {
    if (appData.settings.logo) {
        document.getElementById('businessLogo').src = appData.settings.logo;
        document.getElementById('businessLogo').style.display = 'block';
        document.getElementById('logoIcon').style.display = 'none';
    }
}

function removeLogo() {
    appData.settings.logo = '';
    document.getElementById('businessLogo').style.display = 'none';
    document.getElementById('logoIcon').style.display = 'inline';
    document.getElementById('settingsLogoUrl').value = '';
    document.getElementById('logoPreview').innerHTML = '';
    document.getElementById('removeLogoBtn').style.display = 'none';
    saveData();
    showNotification('Logo eliminado', 'info');
}

// Color Management
function saveColors() {
    appData.settings.colors = {
        primary: document.getElementById('primaryColor').value,
        bgColor1: document.getElementById('bgColor1').value,
        bgColor2: document.getElementById('bgColor2').value
    };
    applyColors();
    saveData();
    showNotification('Colores aplicados exitosamente', 'success');
}

function applyColors() {
    const root = document.documentElement;
    root.style.setProperty('--primary', appData.settings.colors.primary);
    root.style.setProperty('--gradient-1', `linear-gradient(135deg, ${appData.settings.colors.bgColor1} 0%, ${appData.settings.colors.bgColor2} 100%)`);
    document.body.style.background = `linear-gradient(135deg, ${appData.settings.colors.bgColor1} 0%, ${appData.settings.colors.bgColor2} 100%)`;
}

function resetColors() {
    appData.settings.colors = {
        primary: '#2563eb',
        bgColor1: '#667eea',
        bgColor2: '#764ba2'
    };
    document.getElementById('primaryColor').value = '#2563eb';
    document.getElementById('primaryColorHex').value = '#2563eb';
    document.getElementById('bgColor1').value = '#667eea';
    document.getElementById('bgColor2').value = '#764ba2';
    applyColors();
    saveData();
    showNotification('Colores restaurados', 'info');
}

function updateColorFromHex(type) {
    const hex = document.getElementById('primaryColorHex').value;
    if (/^#[0-9A-F]{6}$/i.test(hex)) {
        document.getElementById('primaryColor').value = hex;
    }
}

// Admin Access
function showAdminLogin() {
    if (isAdmin) {
        // If already admin, clicking the lock will logout
        logout();
    } else {
        // If not admin, show login modal
        showModal('adminModal');
        document.getElementById('adminPassword').focus();
    }
}

function login() {
    const password = document.getElementById('adminPassword').value;
    if (password === appData.settings.password) {
        isAdmin = true;
        document.body.classList.add('admin-mode');
        document.getElementById('adminLock').classList.add('unlocked');
        document.getElementById('adminLock').innerHTML = '🔓';
        document.getElementById('adminLock').title = 'Click para cerrar sesión';
        closeModal('adminModal');
        
        // Show admin buttons
        document.getElementById('notificationBtn').style.display = 'inline-block';
        document.getElementById('addProductBtn').style.display = 'inline-block';
        document.getElementById('logoutBtn').style.display = 'inline-block';
        
        // Initialize notifications system
        if (!appData.notifications) {
            appData.notifications = [];
        }
        
        updateDashboard();
        updateNotificationBadge();
        initializeChatbot();
        showNotification('✅ Modo administrador activado', 'success');
        document.getElementById('adminPassword').value = '';
        
        // Check for pending notifications
        if (appData.notifications && appData.notifications.length > 0) {
            const unreadCount = appData.notifications.filter(n => !n.read).length;
            if (unreadCount > 0) {
                showNotification(`📬 Tienes ${unreadCount} notificación(es) sin leer`, 'info');
            }
        }
    } else {
        showNotification('❌ Contraseña incorrecta', 'error');
    }
}

function logout() {
    if (confirm('¿Deseas cerrar la sesión de administrador?')) {
        isAdmin = false;
        document.body.classList.remove('admin-mode');
        document.getElementById('adminLock').classList.remove('unlocked');
        document.getElementById('adminLock').innerHTML = '🔒';
        document.getElementById('adminLock').title = 'Click para iniciar sesión';
        
        // Hide admin buttons
        document.getElementById('notificationBtn').style.display = 'none';
        document.getElementById('addProductBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
        
        // Hide notification dropdown if open
        document.getElementById('notificationDropdown').classList.remove('show');
        
        showSection('catalog', document.querySelector('.nav-tab'));
        initializeChatbot();
        showNotification('👋 Sesión cerrada', 'info');
    }
}

// Navigation
function showSection(sectionName, tabElement) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionName).classList.add('active');
    
    if (tabElement) {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tabElement.classList.add('active');
    }
    
    // Update sections
    if (sectionName === 'dashboard') updateDashboard();
    if (sectionName === 'sales') loadSales();
    if (sectionName === 'clients') loadClients();
    if (sectionName === 'inventory') loadInventory();
    if (sectionName === 'chatbot') loadChatbotSettings();
}

// Notification System Functions
function createPurchaseNotification(data) {
    const notification = {
        id: Date.now().toString(),
        type: 'purchase',
        title: data.source === 'WhatsApp Manual' ? '📱 Pedido WhatsApp Procesado' : '¡Nueva Compra!',
        content: `${data.clientName} (${data.clientPhone}) - ${data.items} producto(s) por ₡${data.total.toLocaleString()}`,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        total: data.total,
        saleId: data.saleId,
        timestamp: new Date().toISOString(),
        read: false,
        source: data.source || 'Sistema'
    };
    
    // Add to notifications array
    if (!appData.notifications) appData.notifications = [];
    appData.notifications.unshift(notification);
    
    // Limit to 50 notifications
    if (appData.notifications.length > 50) {
        appData.notifications = appData.notifications.slice(0, 50);
    }
    
    saveData();
    
    // Update UI
    if (isAdmin) {
        updateNotificationBadge();
        showPurchasePopup(data);
        playNotificationSound();
        sendBrowserNotification(data);
        refreshNotificationList();
    }
}

function toggleNotificationCenter() {
    const dropdown = document.getElementById('notificationDropdown');
    const isOpen = dropdown.classList.contains('show');
    
    if (!isOpen) {
        dropdown.classList.add('show');
        refreshNotificationList();
        markNotificationsAsRead();
    } else {
        dropdown.classList.remove('show');
    }
}

function refreshNotificationList() {
    const list = document.getElementById('notificationList');
    
    if (!appData.notifications || appData.notifications.length === 0) {
        list.innerHTML = `
            <div class="notification-empty">
                <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
                <p>No hay notificaciones nuevas</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = appData.notifications.map(notif => {
        const time = new Date(notif.timestamp).toLocaleTimeString('es-CR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const date = new Date(notif.timestamp).toLocaleDateString('es-CR');
        const today = new Date().toDateString() === new Date(notif.timestamp).toDateString();
        
        const sourceIcon = notif.source === 'WhatsApp Manual' ? '📱' : '🛒';
        
        return `
            <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="viewNotificationDetails('${notif.id}')">
                <div class="notification-item-header">
                    <span class="notification-item-title">${sourceIcon} ${notif.title}</span>
                    <span class="notification-item-time">${today ? time : date}</span>
                </div>
                <div class="notification-item-content">
                    ${notif.content}
                </div>
                <div class="notification-item-actions">
                    <button class="notification-action-btn primary" onclick="event.stopPropagation(); callClient('${notif.clientPhone}')">
                        📞 Llamar
                    </button>
                    <button class="notification-action-btn secondary" onclick="event.stopPropagation(); viewSale('${notif.saleId}')">
                        👁️ Ver Venta
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateNotificationBadge() {
    if (!isAdmin) return;
    
    const badge = document.getElementById('notificationCount');
    const unreadCount = appData.notifications ? 
        appData.notifications.filter(n => !n.read).length : 0;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function markNotificationsAsRead() {
    if (appData.notifications) {
        appData.notifications.forEach(n => n.read = true);
        saveData();
        updateNotificationBadge();
    }
}

function clearAllNotifications() {
    if (confirm('¿Eliminar todas las notificaciones?')) {
        appData.notifications = [];
        saveData();
        refreshNotificationList();
        updateNotificationBadge();
        showNotification('Notificaciones eliminadas', 'info');
    }
}

function showPurchasePopup(data) {
    const popup = document.getElementById('purchasePopup');
    const details = document.getElementById('purchaseDetails');
    
    const sourceText = data.source === 'WhatsApp Manual' ? 
        '<span style="background: var(--whatsapp); color: white; padding: 2px 8px; border-radius: 5px; font-size: 11px;">WhatsApp</span>' : '';
    
    details.innerHTML = `
        <p><strong>${data.clientName}</strong> ${sourceText}</p>
        <p>📱 ${data.clientPhone}</p>
        <p>🛍️ ${data.items} producto(s)</p>
        <p style="font-size: 18px; color: var(--success); margin-top: 10px;">
            <strong>Total: ₡${data.total.toLocaleString()}</strong>
        </p>
    `;
    
    popup.classList.add('show');
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        popup.classList.remove('show');
    }, 5000);
}

function closePurchasePopup() {
    document.getElementById('purchasePopup').classList.remove('show');
}

function playNotificationSound() {
    const soundEnabled = document.getElementById('notificationSound').checked;
    if (soundEnabled && appData.settings.notifications.sound !== false) {
        // Create a simple beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }
}

function sendBrowserNotification(data) {
    const browserEnabled = document.getElementById('browserNotifications').checked;
    
    if (browserEnabled && 'Notification' in window && Notification.permission === 'granted') {
        const icon = data.source === 'WhatsApp Manual' ? '📱' : '🛍️';
        const title = data.source === 'WhatsApp Manual' ? 
            '📱 Pedido WhatsApp Procesado' : 
            '🛍️ ¡Nueva Compra Recibida!';
        
        const notification = new Notification(title, {
            body: `${data.clientName} (${data.clientPhone})\nTotal: ₡${data.total.toLocaleString()}`,
            icon: icon,
            badge: icon,
            tag: 'purchase-' + data.saleId,
            requireInteraction: true
        });
        
        notification.onclick = function() {
            window.focus();
            viewSale(data.saleId);
            notification.close();
        };
        
        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
    }
}

function toggleBrowserNotifications() {
    const checkbox = document.getElementById('browserNotifications');
    
    if (checkbox.checked) {
        requestNotificationPermission();
    }
    
    // Save preference
    if (!appData.settings.notifications) {
        appData.settings.notifications = {};
    }
    appData.settings.notifications.browser = checkbox.checked;
    appData.settings.notifications.sound = document.getElementById('notificationSound').checked;
    
    saveData();
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showNotification('Notificaciones del navegador activadas', 'success');
            } else {
                document.getElementById('browserNotifications').checked = false;
                showNotification('Permiso de notificaciones denegado', 'warning');
            }
        });
    }
}

function callClient(phone) {
    window.location.href = `tel:${phone}`;
}

function viewSale(saleId) {
    const sale = appData.sales.find(s => s.id === saleId);
    if (sale) {
        showSection('sales');
        // Highlight the sale row
        setTimeout(() => {
            const row = document.querySelector(`tr[data-sale-id="${saleId}"]`);
            if (row) {
                row.style.backgroundColor = 'var(--warning)';
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 2000);
            }
        }, 100);
    }
}

function viewNotificationDetails(notificationId) {
    const notification = appData.notifications.find(n => n.id === notificationId);
    if (notification && notification.saleId) {
        viewSale(notification.saleId);
        toggleNotificationCenter();
    }
}

// Products Management
function loadProducts() {
    const grid = document.getElementById('productsGrid');
    let products = appData.products;
    
    if (currentFilter !== 'all') {
        products = products.filter(p => p.category === currentFilter);
    }
    
    if (products.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-state-icon">📦</div><p>No hay productos</p>' + 
            (isAdmin ? '<p style="margin-top: 10px;">Agrega productos con el botón "➕ Producto"</p>' : '') + '</div>';
        return;
    }
    
    grid.innerHTML = products.map(product => {
        const stockClass = product.stock === 0 ? 'out' : product.stock <= 5 ? 'low' : '';
        const stockText = product.stock === 0 ? 'Agotado' : `Stock: ${product.stock}`;
        const hasImage = product.image && product.image !== '';
        const imageStyle = hasImage ? `style="background-image: url('${product.image}');"` : '';
        const imageClass = hasImage ? 'has-image' : '';
        const icon = getCategoryIcon(product.category);
        
        return `
            <div class="product-card">
                <div class="product-image ${imageClass}" ${imageStyle}>
                    ${!hasImage ? icon : ''}
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-description">${product.description || ''}</div>
                    <div class="product-price">₡${product.price.toLocaleString()}</div>
                    <div class="product-stock ${stockClass}">${stockText}</div>
                    <div class="product-actions">
                        <button class="btn-add-cart" onclick="addToCart('${product.id}')" ${product.stock === 0 ? 'disabled' : ''}>
                            ${product.stock > 0 ? '➕ Agregar' : '❌ Sin Stock'}
                        </button>
                        ${isAdmin ? `
                            <button class="btn-edit" onclick="editProduct('${product.id}')">✏️</button>
                            <button class="btn-delete" onclick="deleteProduct('${product.id}')">🗑️</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getCategoryIcon(category) {
    const icons = {
        'Alimentos': '🍕',
        'Bebidas': '☕',
        'Tecnología': '💻',
        'Hogar': '🏠',
        'Ropa': '👕',
        'Salud': '💊',
        'Otros': '📦'
    };
    return icons[category] || '📦';
}

function saveProduct(event) {
    event.preventDefault();
    
    const productData = {
        id: document.getElementById('productId').value || Date.now().toString(),
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDescription').value,
        price: parseInt(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        image: document.getElementById('productImageUrl').value || ''
    };
    
    if (editingProductId) {
        const index = appData.products.findIndex(p => p.id === editingProductId);
        appData.products[index] = productData;
        editingProductId = null;
        showNotification('Producto actualizado', 'success');
    } else {
        appData.products.push(productData);
        showNotification('Producto agregado', 'success');
    }
    
    saveData();
    loadProducts();
    loadInventory();
    closeModal('productModal');
    
    // Reset form
    event.target.reset();
    document.getElementById('imagePreview').classList.remove('show');
}

function editProduct(id) {
    const product = appData.products.find(p => p.id === id);
    if (!product) return;
    
    editingProductId = id;
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productImageUrl').value = product.image || '';
    
    if (product.image) {
        document.getElementById('imagePreview').src = product.image;
        document.getElementById('imagePreview').classList.add('show');
    }
    
    document.getElementById('productModalTitle').textContent = 'Editar Producto';
    showModal('productModal');
}

function deleteProduct(id) {
    if (confirm('¿Eliminar este producto?')) {
        appData.products = appData.products.filter(p => p.id !== id);
        saveData();
        loadProducts();
        loadInventory();
        showNotification('Producto eliminado', 'warning');
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('productImageUrl').value = e.target.result;
            document.getElementById('imagePreview').src = e.target.result;
            document.getElementById('imagePreview').classList.add('show');
        };
        reader.readAsDataURL(file);
    }
}

// Cart Functions
function addToCart(productId) {
    const product = appData.products.find(p => p.id === productId);
    if (!product || product.stock === 0) return;
    
    const cartItem = appData.cart.find(item => item.id === productId);
    if (cartItem) {
        if (cartItem.quantity < product.stock) {
            cartItem.quantity++;
        } else {
            showNotification('No hay más stock disponible', 'warning');
            return;
        }
    } else {
        appData.cart.push({ ...product, quantity: 1 });
    }
    
    updateCartBadge();
    saveData();
    showNotification('Agregado al carrito', 'success');
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    const count = appData.cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = count;
    badge.classList.toggle('show', count > 0);
}

function openCart() {
    showModal('cartModal');
    renderCart();
}

function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const clientForm = document.getElementById('clientForm');
    
    if (appData.cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><p>Tu carrito está vacío</p></div>';
        cartTotal.style.display = 'none';
        clientForm.style.display = 'none';
        return;
    }
    
    cartItems.innerHTML = appData.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">₡${item.price.toLocaleString()} x ${item.quantity} = ₡${(item.price * item.quantity).toLocaleString()}</div>
            </div>
            <div class="quantity-controls">
                <button class="quantity-btn" onclick="changeQuantity('${item.id}', -1)" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="quantity-btn" onclick="changeQuantity('${item.id}', 1)" ${item.quantity >= item.stock ? 'disabled' : ''}>+</button>
                <button class="btn-remove" onclick="removeFromCart('${item.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
    
    updateCartTotals();
    cartTotal.style.display = 'block';
    clientForm.style.display = 'block';
}

function changeQuantity(productId, change) {
    const cartItem = appData.cart.find(item => item.id === productId);
    const product = appData.products.find(p => p.id === productId);
    
    if (!cartItem || !product) return;
    
    const newQuantity = cartItem.quantity + change;
    if (newQuantity > 0 && newQuantity <= product.stock) {
        cartItem.quantity = newQuantity;
        saveData();
        renderCart();
        updateCartBadge();
    }
}

function removeFromCart(productId) {
    appData.cart = appData.cart.filter(item => item.id !== productId);
    saveData();
    renderCart();
    updateCartBadge();
    showNotification('Producto eliminado del carrito', 'info');
}

function updateCartTotals() {
    const subtotal = appData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * 0.13);
    const total = subtotal + tax;
    
    document.getElementById('subtotal').textContent = '₡' + subtotal.toLocaleString();
    document.getElementById('tax').textContent = '₡' + tax.toLocaleString();
    document.getElementById('total').textContent = '₡' + total.toLocaleString();
}

function sendWhatsApp() {
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    
    if (!name || !phone) {
        document.getElementById('nameError').style.display = name ? 'none' : 'block';
        document.getElementById('phoneError').style.display = phone ? 'none' : 'block';
        showNotification('Por favor complete los campos requeridos', 'error');
        return;
    }
    
    const address = document.getElementById('clientAddress').value.trim();
    const notes = document.getElementById('clientNotes').value.trim();
    
    // Create sale record
    const sale = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        client: { name, phone, address },
        items: appData.cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity
        })),
        subtotal: appData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        tax: Math.round(appData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.13),
        total: 0,
        status: 'Pendiente'
    };
    sale.total = sale.subtotal + sale.tax;
    
    // Save sale
    appData.sales.push(sale);
    
    // Update or create client
    let client = appData.clients.find(c => c.phone === phone);
    if (client) {
        client.purchases++;
        client.totalSpent += sale.total;
        if (address && !client.address) client.address = address;
    } else {
        appData.clients.push({
            name,
            phone,
            address,
            purchases: 1,
            totalSpent: sale.total
        });
    }
    
    // Update inventory
    appData.cart.forEach(cartItem => {
        const product = appData.products.find(p => p.id === cartItem.id);
        if (product) {
            product.stock -= cartItem.quantity;
        }
    });
    
    // Create notification for admin
    createPurchaseNotification({
        clientName: name,
        clientPhone: phone,
        items: appData.cart.length,
        total: sale.total,
        saleId: sale.id
    });
    
    // Format WhatsApp message
    let message = `🛍️ *NUEVO PEDIDO*\n\n`;
    message += `*Cliente:* ${name}\n`;
    message += `*Teléfono:* ${phone}\n`;
    if (address) message += `*Dirección:* ${address}\n`;
    message += `\n📦 *Productos:*\n`;
    
    appData.cart.forEach(item => {
        message += `• ${item.name} x${item.quantity} = ₡${(item.price * item.quantity).toLocaleString()}\n`;
    });
    
    message += `\n*Subtotal:* ₡${sale.subtotal.toLocaleString()}\n`;
    message += `*IVA (13%):* ₡${sale.tax.toLocaleString()}\n`;
    message += `*TOTAL:* ₡${sale.total.toLocaleString()}\n`;
    
    if (notes) message += `\n📝 *Notas:* ${notes}`;
    
    // Send WhatsApp
    const whatsappUrl = `https://wa.me/${appData.settings.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    // Clear cart
    appData.cart = [];
    lastSaleData = sale;
    
    // Save all changes
    saveData();
    updateCartBadge();
    loadProducts();
    
    // Show success
    showNotification('Pedido enviado por WhatsApp', 'success');
    
    // Reset form
    document.getElementById('clientName').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientAddress').value = '';
    document.getElementById('clientNotes').value = '';
    
    setTimeout(() => {
        closeModal('cartModal');
        renderCart();
    }, 2000);
}

// Other sections
function updateDashboard() {
    const totalSales = appData.sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalClients = appData.clients.length;
    const totalProducts = appData.products.length;
    const today = new Date().toDateString();
    const todayOrders = appData.sales.filter(s => new Date(s.date).toDateString() === today).length;
    
    document.getElementById('totalSales').textContent = '₡' + totalSales.toLocaleString();
    document.getElementById('totalClients').textContent = totalClients;
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('todayOrders').textContent = todayOrders;
    
    // Recent sales
    const recentSales = appData.sales.slice(-5).reverse();
    const recentSalesTable = document.getElementById('recentSalesTable');
    
    if (recentSales.length > 0) {
        recentSalesTable.innerHTML = recentSales.map(sale => `
            <tr>
                <td>${new Date(sale.date).toLocaleDateString('es-CR')}</td>
                <td>${sale.client.name}</td>
                <td>₡${sale.total.toLocaleString()}</td>
                <td><span style="background: ${sale.status === 'Completado' ? 'var(--success)' : 'var(--warning)'}; color: white; padding: 3px 8px; border-radius: 5px; font-size: 12px;">${sale.status}</span></td>
            </tr>
        `).join('');
    }
}

function loadSales() {
    const salesTable = document.getElementById('salesTable');
    
    if (appData.sales.length === 0) {
        salesTable.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay ventas</td></tr>';
        return;
    }
    
    salesTable.innerHTML = appData.sales.slice().reverse().map(sale => {
        const sourceIcon = sale.source === 'WhatsApp Manual' ? '📱' : '🛒';
        return `
            <tr data-sale-id="${sale.id}">
                <td>${sourceIcon} #${sale.id.slice(-6)}</td>
                <td>${new Date(sale.date).toLocaleDateString('es-CR')}</td>
                <td>${sale.client.name}</td>
                <td>₡${sale.total.toLocaleString()}</td>
                <td><span style="background: ${sale.status === 'Completado' ? 'var(--success)' : 'var(--warning)'}; color: white; padding: 3px 8px; border-radius: 5px; font-size: 12px;">${sale.status}</span></td>
                <td>
                    <button class="btn-primary btn-success" onclick="markAsComplete('${sale.id}')" style="padding: 5px 10px; font-size: 12px;" ${sale.status === 'Completado' ? 'disabled' : ''}>✓ Completar</button>
                </td>
            </tr>
        `;
    }).join('');
}

function markAsComplete(saleId) {
    const sale = appData.sales.find(s => s.id === saleId);
    if (sale) {
        sale.status = 'Completado';
        saveData();
        loadSales();
        showNotification('Venta marcada como completada', 'success');
    }
}

function loadClients() {
    const clientsTable = document.getElementById('clientsTable');
    
    if (appData.clients.length === 0) {
        clientsTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay clientes</td></tr>';
        return;
    }
    
    clientsTable.innerHTML = appData.clients.map(client => `
        <tr>
            <td>${client.name}</td>
            <td>${client.phone}</td>
            <td>${client.address || '-'}</td>
            <td>${client.purchases}</td>
            <td>₡${client.totalSpent.toLocaleString()}</td>
        </tr>
    `).join('');
}

function loadInventory() {
    const inventoryTable = document.getElementById('inventoryTable');
    
    if (appData.products.length === 0) {
        inventoryTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay productos</td></tr>';
        return;
    }
    
    inventoryTable.innerHTML = appData.products.map(product => `
        <tr>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>
                <span style="background: ${product.stock === 0 ? 'var(--danger)' : product.stock <= 5 ? 'var(--warning)' : 'var(--success)'}; color: white; padding: 3px 8px; border-radius: 5px;">
                    ${product.stock}
                </span>
            </td>
            <td>₡${product.price.toLocaleString()}</td>
            <td>
                <button class="btn-primary" onclick="editProduct('${product.id}')" style="padding: 5px 10px; font-size: 12px;">✏️ Editar</button>
                <button class="btn-primary btn-danger" onclick="deleteProduct('${product.id}')" style="padding: 5px 10px; font-size: 12px; margin-left: 5px;">🗑️ Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// Settings
function saveSettings() {
    const newName = document.getElementById('settingsBusinessName').value;
    const newWhatsApp = document.getElementById('settingsWhatsApp').value;
    const newEmail = document.getElementById('settingsEmail').value;
    const newPassword = document.getElementById('settingsPassword').value;
    const newLogo = document.getElementById('settingsLogoUrl').value;
    
    appData.settings.businessName = newName || appData.settings.businessName;
    appData.settings.whatsapp = newWhatsApp || appData.settings.whatsapp;
    appData.settings.email = newEmail || appData.settings.email;
    
    if (newPassword) {
        appData.settings.password = newPassword;
        document.getElementById('settingsPassword').value = '';
    }
    
    if (newLogo && newLogo !== appData.settings.logo) {
        appData.settings.logo = newLogo;
        updateLogo();
    }
    
    document.getElementById('businessName').textContent = appData.settings.businessName;
    
    saveData();
    showNotification('Configuración guardada', 'success');
}

function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `backup_${appData.settings.businessName}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification('Backup descargado', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (confirm('¿Importar estos datos? Se reemplazarán todos los datos actuales.')) {
                    appData = importedData;
                    saveData();
                    location.reload();
                }
            } catch (error) {
                showNotification('Error al importar archivo', 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// Chatbot Functions
function initializeChatbot() {
    if (!appData.chatbot) {
        appData.chatbot = {
            enabled: true,
            name: 'Asistente Virtual',
            welcome: '¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
            faqs: [],
            quickResponses: {
                horario: 'Nuestro horario de atención es de Lunes a Viernes.',
                entrega: 'Los tiempos de entrega son de 24-48 horas.',
                pago: 'Aceptamos: Efectivo, SINPE Móvil, Transferencia.',
                contacto: ''
            }
        };
    }
    
    // Update contact response
    appData.chatbot.quickResponses.contacto = `Puedes contactarnos por WhatsApp al ${appData.settings.whatsapp || 'número no configurado'}`;
    
    // Update chatbot title
    document.getElementById('chatbotTitle').textContent = appData.chatbot.name || 'Asistente Virtual';
    
    // Show/hide widget
    const widget = document.getElementById('chatbotWidget');
    if (widget) {
        widget.style.display = (appData.chatbot.enabled && !isAdmin) ? 'block' : 'none';
    }
    
    // Show notification dot on first visit
    if (!sessionStorage.getItem('chatbotWelcomed') && !isAdmin && appData.chatbot.enabled) {
        setTimeout(() => {
            const dot = document.querySelector('.notification-dot');
            if (dot) dot.style.display = 'block';
        }, 3000);
    }
}

function toggleChatbot() {
    const window = document.getElementById('chatbotWindow');
    const isOpen = window.classList.contains('show');
    
    if (!isOpen) {
        window.classList.add('show');
        
        // Send welcome message if first time
        if (!sessionStorage.getItem('chatbotWelcomed')) {
            const messages = document.getElementById('chatMessages');
            messages.innerHTML = '';
            addBotMessage(appData.chatbot.welcome);
            sessionStorage.setItem('chatbotWelcomed', 'true');
            
            // Hide notification dot
            const dot = document.querySelector('.notification-dot');
            if (dot) dot.style.display = 'none';
        }
    } else {
        window.classList.remove('show');
    }
}

function addBotMessage(message) {
    const messages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot';
    messageDiv.innerHTML = `
        <div class="message-bubble">${message}</div>
        <div class="message-time">${new Date().toLocaleTimeString('es-CR', {hour: '2-digit', minute:'2-digit'})}</div>
    `;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

function addUserMessage(message) {
    const messages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message user';
    messageDiv.innerHTML = `
        <div class="message-bubble">${message}</div>
        <div class="message-time">${new Date().toLocaleTimeString('es-CR', {hour: '2-digit', minute:'2-digit'})}</div>
    `;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

function sendQuickMessage(type) {
    const responses = appData.chatbot.quickResponses;
    const messages = {
        'horario': '¿Cuál es su horario de atención?',
        'entrega': '¿Cuáles son los tiempos de entrega?',
        'pago': '¿Qué métodos de pago aceptan?',
        'contacto': '¿Cómo puedo contactarlos?'
    };
    
    addUserMessage(messages[type]);
    showTypingIndicator();
    
    setTimeout(() => {
        hideTypingIndicator();
        addBotMessage(responses[type]);
    }, 1000);
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    addUserMessage(message);
    input.value = '';
    showTypingIndicator();
    
    setTimeout(() => {
        hideTypingIndicator();
        const response = processUserMessage(message);
        addBotMessage(response);
    }, 1500);
}

function processUserMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Check FAQs
    if (appData.chatbot.faqs) {
        for (let faq of appData.chatbot.faqs) {
            if (faq.question) {
                const keywords = faq.question.toLowerCase().split(' ');
                let matchCount = 0;
                for (let keyword of keywords) {
                    if (keyword.length > 3 && lowerMessage.includes(keyword)) {
                        matchCount++;
                    }
                }
                if (matchCount >= 2) {
                    return faq.answer;
                }
            }
        }
    }
    
    // Check keywords
    if (lowerMessage.includes('precio') || lowerMessage.includes('costo')) {
        return 'Para conocer los precios, revisa nuestro catálogo de productos. Los precios están actualizados en cada producto.';
    }
    
    if (lowerMessage.includes('pedido') || lowerMessage.includes('comprar')) {
        return 'Para realizar un pedido: 1) Agrega productos al carrito, 2) Completa tus datos, 3) Envía el pedido por WhatsApp.';
    }
    
    // Default
    return `No tengo una respuesta específica para eso. Contacta por WhatsApp al ${appData.settings.whatsapp || 'número no configurado'} para más información.`;
}

function showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.classList.add('show');
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.classList.remove('show');
}

// Chatbot Admin Functions
function loadChatbotSettings() {
    if (!appData.chatbot) initializeChatbot();
    
    document.getElementById('botName').value = appData.chatbot.name || '';
    document.getElementById('botWelcome').value = appData.chatbot.welcome || '';
    document.getElementById('botEnabled').checked = appData.chatbot.enabled;
    document.getElementById('botHours').value = appData.chatbot.quickResponses.horario || '';
    document.getElementById('botDelivery').value = appData.chatbot.quickResponses.entrega || '';
    document.getElementById('botPayment').value = appData.chatbot.quickResponses.pago || '';
    
    loadFAQList();
}

function saveChatbotSettings() {
    appData.chatbot.name = document.getElementById('botName').value || 'Asistente Virtual';
    appData.chatbot.welcome = document.getElementById('botWelcome').value || '¡Hola! ¿En qué puedo ayudarte?';
    appData.chatbot.enabled = document.getElementById('botEnabled').checked;
    
    saveData();
    initializeChatbot();
    showNotification('Configuración del chatbot guardada', 'success');
}

function saveQuickResponses() {
    appData.chatbot.quickResponses.horario = document.getElementById('botHours').value;
    appData.chatbot.quickResponses.entrega = document.getElementById('botDelivery').value;
    appData.chatbot.quickResponses.pago = document.getElementById('botPayment').value;
    
    saveData();
    showNotification('Respuestas rápidas guardadas', 'success');
}

function loadFAQList() {
    const container = document.getElementById('faqList');
    if (!container || !appData.chatbot.faqs) return;
    
    if (appData.chatbot.faqs.length === 0) {
        container.innerHTML = '<p style="color: #6b7280;">No hay preguntas frecuentes configuradas</p>';
        return;
    }
    
    container.innerHTML = appData.chatbot.faqs.map((faq, index) => `
        <div class="faq-item">
            <input type="text" class="form-input" value="${faq.question || ''}" placeholder="Pregunta" onchange="updateFAQ(${index}, 'question', this.value)">
            <textarea class="form-textarea" placeholder="Respuesta" onchange="updateFAQ(${index}, 'answer', this.value)">${faq.answer || ''}</textarea>
            <button class="btn-primary btn-danger" onclick="deleteFAQ(${index})" style="padding: 5px 15px; font-size: 14px;">🗑️ Eliminar</button>
        </div>
    `).join('');
}

function addFAQ() {
    if (!appData.chatbot.faqs) appData.chatbot.faqs = [];
    appData.chatbot.faqs.push({ question: '', answer: '' });
    loadFAQList();
}

function updateFAQ(index, field, value) {
    appData.chatbot.faqs[index][field] = value;
    saveData();
}

function deleteFAQ(index) {
    if (confirm('¿Eliminar esta pregunta frecuente?')) {
        appData.chatbot.faqs.splice(index, 1);
        saveData();
        loadFAQList();
        showNotification('Pregunta eliminada', 'warning');
    }
}

// Utilities
function filterCategory(category, btn) {
    currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadProducts();
}

function searchProducts(term) {
    const cards = document.querySelectorAll('.product-card');
    const searchTerm = term.toLowerCase();
    
    cards.forEach(card => {
        const name = card.querySelector('.product-name').textContent.toLowerCase();
        const description = card.querySelector('.product-description').textContent.toLowerCase();
        const category = card.querySelector('.product-category').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || description.includes(searchTerm) || category.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}
