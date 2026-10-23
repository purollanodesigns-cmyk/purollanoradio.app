/**
 * @fileoverview js/sidebar.js - Cargador dinámico y unificado del Sidebar.
 * Patrón: Singleton / Module Pattern.
 * Responsabilidad: Inyectar la estructura del sidebar aside#mainSidebar en
 * todas las páginas HTML y gestionar el estado activo del menú basado en la URL.
 *
 * Rediseño premium: estructura visual mejorada con branding, secciones agrupadas
 * y efectos glassmorphism. Todos los elementos originales preservados.
 * Cumple con la regla DRY al evitar duplicidad en múltiples archivos HTML.
 */

(function() {
    'use strict';

    // -------------------------------------------------------------------------
    // Plantilla HTML unificada del Sidebar (rediseñada - elementos 100% originales)
    // -------------------------------------------------------------------------
    const SIDEBAR_HTML = `
        <!-- ── HEADER: Logo + Campana de Notificaciones ── -->
        <div class="sidebar-header">
            <!-- Branding de la Radio -->
            <div class="sidebar-brand">
                <div class="sidebar-brand-logo" style="width: 42px; height: 42px; min-width: 42px; flex-shrink: 0; overflow: hidden; border-radius: 12px; border: 1.5px solid rgba(254, 210, 2, 0.4);">
                    <img src="./PUROLLANORADIO-COM-ICONO.png" alt="Puro Llano Radio Logo" class="sidebar-logo-img" style="width: 100%; height: 100%; max-width: 100%; object-fit: cover; display: block;">
                </div>
                <div class="sidebar-brand-info">
                    <span class="sidebar-brand-name">Puro Llano Radio</span>
                    <span class="sidebar-brand-live">
                        <span class="live-dot-anim"></span>
                        EN VIVO 24/7
                    </span>
                </div>
            </div>
            <!-- Botón de Notificaciones -->
            <div class="header-actions">
                <button class="btn-notify" id="notifyBtn" aria-label="Notificaciones"
                    onclick="toggleNotifyInbox(); return false;">
                    <i class="fa fa-bell"></i>
                    <span class="notify-badge hidden" id="notifyBadge">0</span>
                </button>
            </div>
        </div>

        <!-- ── PANEL: Bandeja de Notificaciones (In-App Inbox) ── -->
        <div class="notify-inbox-panel" id="notifyInboxPanel">
            <div class="notify-inbox-header">
                <h4><i class="fa fa-envelope-open-text"></i> Últimas Novedades</h4>
                <div class="inbox-actions">
                    <button class="btn-mark-read" onclick="markAllAsRead()" title="Marcar todas como leídas">
                        <i class="fa fa-check-double"></i>
                    </button>
                    <button class="btn-close-inbox" onclick="toggleNotifyInbox()" aria-label="Cerrar notificaciones">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="notify-inbox-content" id="notifyInboxContent">
                <div class="notify-empty-state">
                    <i class="fa fa-box-open"></i>
                    <p>No hay notificaciones por ahora.</p>
                </div>
            </div>
        </div>

        <!-- ── WIDGET: Oyentes Conectados ── -->
        <div class="widget-oyentes-container">
            <iframe
                src="https://mipanel.stream/widget-oyentes-count.php?porta=6816&token=&code=NjgxNisx&style=classic&bg=%23ffffff&fg=%23111827&accent=%23fed202&style=classic&fs=52&title=Oyentes%20conectados&ts=14"
                frameborder="0" style="width:280px;height:147px;border:0;" loading="lazy"
                title="Oyentes Conectados"></iframe>
        </div>

        <!-- ── NAVEGACIÓN PRINCIPAL ── -->
        <div class="sidebar-nav-content">

            <!-- Sección: Menú -->
            <div class="nav-section-label">
                <span class="nav-section-icon">◈</span>
                <span>Menú</span>
                <div class="nav-section-line"></div>
            </div>

            <a href="top5semanal.html" class="menu-item" id="menu-top5">
                <div class="menu-item-icon-wrap">
                    <i class="fa fa-trophy"></i>
                </div>
                <span class="menu-item-label">Top 5 Semanal</span>
                <span class="menu-item-arrow"><i class="fa fa-chevron-right"></i></span>
            </a>

            <a href="programacion.html" class="menu-item" id="menu-programacion">
                <div class="menu-item-icon-wrap">
                    <i class="fa fa-calendar-alt"></i>
                </div>
                <span class="menu-item-label">Programación</span>
                <span class="menu-item-arrow"><i class="fa fa-chevron-right"></i></span>
            </a>

            <a href="blog.html" class="menu-item" id="menu-blog">
                <div class="menu-item-icon-wrap">
                    <i class="fa fa-book-open"></i>
                </div>
                <span class="menu-item-label">Blog de Folklore</span>
                <span class="menu-item-arrow"><i class="fa fa-chevron-right"></i></span>
            </a>

            <a href="acerca.html" class="menu-item" id="menu-acerca">
                <div class="menu-item-icon-wrap">
                    <i class="fa fa-info-circle"></i>
                </div>
                <span class="menu-item-label">Acerca de</span>
                <span class="menu-item-arrow"><i class="fa fa-chevron-right"></i></span>
            </a>

            <a href="artistas.html" class="menu-item" id="menu-artistas">
                <div class="menu-item-icon-wrap">
                    <i class="fa fa-star"></i>
                </div>
                <span class="menu-item-label">Artistas</span>
                <span class="menu-item-arrow"><i class="fa fa-chevron-right"></i></span>
            </a>

            <a href="politica-privacidad.html" class="menu-item" id="menu-privacidad">
                <div class="menu-item-icon-wrap">
                    <i class="fa fa-shield-alt"></i>
                </div>
                <span class="menu-item-label">Privacidad</span>
                <span class="menu-item-arrow"><i class="fa fa-chevron-right"></i></span>
            </a>

            <!-- Chat en Vivo (elemento especial con badge) -->
            <a href="#" onclick="toggleChatInterno(); return false;"
               class="menu-item menu-item-chat" id="menu-chat">
                <div class="menu-item-icon-wrap">
                    <i class="fa fa-comments"></i>
                </div>
                <span class="menu-item-label">Chat en Vivo</span>
                <span class="menu-badge" id="menuChatBadge">0</span>
            </a>

            <!-- Sección: Redes Sociales -->
            <div class="nav-section-label">
                <span class="nav-section-icon">◈</span>
                <span>Síguenos</span>
                <div class="nav-section-line"></div>
            </div>

            <div class="social-grid">
                <a href="https://instagram.com/purollanoradio" target="_blank" class="social-item instagram">
                    <i class="fa-brands fa-instagram"></i>
                    <span>Instagram</span>
                </a>
                <a href="https://facebook.com/purollanoradio" target="_blank" class="social-item facebook">
                    <i class="fa-brands fa-facebook"></i>
                    <span>Facebook</span>
                </a>
                <a href="https://youtube.com/@purollanoradio" target="_blank" class="social-item youtube">
                    <i class="fa-brands fa-youtube"></i>
                    <span>YouTube</span>
                </a>
                <a href="https://twitter.com/purollanoradio" target="_blank" class="social-item x">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>X</span>
                </a>
            </div>

            <!-- Sección: Contacto -->
            <div class="nav-section-label">
                <span class="nav-section-icon">◈</span>
                <span>Contacto</span>
                <div class="nav-section-line"></div>
            </div>

            <div class="contact-grid">
                <a href="https://chat.whatsapp.com/EvqnlnK4wOG0EdD4qiFNiL?mode=gi_t" target="_blank"
                    class="contact-item whatsapp-group">
                    <i class="fa-brands fa-whatsapp"></i>
                    <span>Unirme al Grupo</span>
                </a>
                <a href="#" onclick="contactarWhatsAppMenu(event); return false;" class="contact-item whatsapp-contact">
                    <i class="fa-brands fa-whatsapp"></i>
                    <span>+58 416-4242274</span>
                </a>
                <a href="mailto:purollanoradio@gmail.com" class="contact-item email-contact">
                    <i class="fa fa-envelope"></i>
                    <span>purollanoradio@gmail.com</span>
                </a>
            </div>

            <!-- Sección: Historial de Temas -->
            <div class="nav-section-label">
                <span class="nav-section-icon">◈</span>
                <span>Historial de Temas</span>
                <div class="nav-section-line"></div>
            </div>

            <div class="history-container widget-historial" id="historyContainer">
                <div class="history-header">
                    <span class="history-title"><i class="fa fa-clock"></i> Últimas Canciones</span>
                    <button class="history-clear" onclick="clearHistory()" title="Limpiar historial">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
                <div class="history-list" id="historyList">
                    <div class="history-loading">
                        <i class="fa fa-spinner fa-spin"></i>
                        <p>Conectando con el streaming...</p>
                    </div>
                </div>
                <div class="history-footer">
                    <span id="historyCount">
                        <i class="fa fa-circle-notch fa-spin"></i> Cargando canciones...
                    </span>
                </div>
            </div>

            <!-- Sección: Audiencia Global -->
            <div class="nav-section-label">
                <span class="nav-section-icon">◈</span>
                <span>Audiencia Global</span>
                <div class="nav-section-line"></div>
            </div>

            <div class="listeners-container widget-listeners" id="listenersContainer">
                <div class="listeners-header">
                    <span class="listeners-title"><i class="fa fa-signal"></i> Estadísticas en Vivo</span>
                    <span class="listeners-total" id="totalListeners">
                        <i class="fa fa-circle-notch fa-spin"></i>
                    </span>
                </div>
                <div class="listeners-list" id="listenersList">
                    <div class="listeners-loading">
                        <i class="fa fa-spinner fa-spin"></i>
                        <p>Conectando con el streaming...</p>
                    </div>
                </div>
                <div class="listeners-footer">
                    <span id="lastUpdate">Actualizado: --:--:--</span>
                </div>
            </div>

            <!-- Sección: Notificaciones Push -->
            <div class="nav-section-label">
                <span class="nav-section-icon">◈</span>
                <span>Notificaciones</span>
                <div class="nav-section-line"></div>
            </div>

            <div class="notify-section">
                <p class="notify-text">Activa las notificaciones para recibir actualizaciones en tiempo real</p>
                <button class="btn-notify-activate" id="btnActivateNotify"
                    onclick="subscribeNotifications(); return false;">
                    <i class="fa fa-bell"></i>
                    <span>Activar Notificaciones</span>
                </button>
                <p class="notify-status" id="notifyStatus"></p>
            </div>

            <!-- Sección: Estadísticas / Contador de Visitas -->
            <div class="nav-section-label">
                <span class="nav-section-icon">◈</span>
                <span>Estadísticas</span>
                <div class="nav-section-line"></div>
            </div>

            <div class="visit-counter-section" id="visitCounterWidget">
                <div class="visit-counter-header">
                    <span class="visit-counter-title">
                        <i class="fa fa-chart-line"></i> Contador de Visitas
                    </span>
                    <span class="visit-counter-live-dot"></span>
                </div>
                <div class="visit-counter-grid">
                    <div class="visit-counter-card visit-daily">
                        <div class="visit-counter-icon">
                            <i class="fa fa-calendar-day"></i>
                        </div>
                        <div class="visit-counter-value" id="visitDailyCount">0</div>
                        <div class="visit-counter-label">Hoy</div>
                    </div>
                    <div class="visit-counter-card visit-total">
                        <div class="visit-counter-icon">
                            <i class="fa fa-eye"></i>
                        </div>
                        <div class="visit-counter-value" id="visitTotalCount">0</div>
                        <div class="visit-counter-label">Total</div>
                    </div>
                </div>
                <div class="visit-counter-footer">
                    <span id="visitDateLabel" data-date="">En tiempo real</span>
                </div>
            </div>

        </div>
        <!-- ── FIN NAVEGACIÓN ── -->

        <!-- ── FOOTER: Descargar App ── -->
        <div class="sidebar-footer">
            <a href="https://play.google.com/store/apps/details?id=com.radioshd.purollanoradio" target="_blank"
                class="btn-download-app">
                <i class="fa fa-download"></i>
                Descargar App
            </a>
        </div>
    `;

    /**
     * Inyecta el contenido del sidebar y gestiona las clases activas.
     */
    function initSidebar() {
        const sidebarContainer = document.getElementById('mainSidebar');
        if (!sidebarContainer) {
            console.warn('⚠️ [Sidebar] No se encontró el contenedor #mainSidebar');
            return;
        }

        // Inyectar HTML
        sidebarContainer.innerHTML = SIDEBAR_HTML;
        console.log('✅ [Sidebar] Sidebar dinámico inyectado correctamente');

        // Establecer la clase activa según el archivo actual
        const currentPath = window.location.pathname;
        const page = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';

        // Remover todas las clases activas
        const menuItems = sidebarContainer.querySelectorAll('.menu-item');
        menuItems.forEach(item => item.classList.remove('active'));

        // Mapeo de páginas a IDs de menús
        const pageToIdMap = {
            'index.html': 'menu-home',
            'top5semanal.html': 'menu-top5',
            'programacion.html': 'menu-programacion',
            'blog.html': 'menu-blog',
            'acerca.html': 'menu-acerca',
            'artistas.html': 'menu-artistas',
            'politica-privacidad.html': 'menu-privacidad',
            'chat.html': 'menu-chat'
        };

        const activeId = pageToIdMap[page];
        if (activeId) {
            const activeLink = document.getElementById(activeId);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        } else if (page === '' || page === '/') {
            // Fallback para raíz
            const homeLink = document.getElementById('menu-home');
            if (homeLink) homeLink.classList.add('active');
        }
    }

    // Registrar inicio del sidebar en el ciclo de carga del DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
    } else {
        initSidebar();
    }
})();
