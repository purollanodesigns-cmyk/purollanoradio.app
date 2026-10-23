// Widget para Android - Puro Llano Radio
// Este widget muestra el estado de la radio en la pantalla principal

const widget = require('@widget/widget');

// Widget pequeño (1x1)
widget.createSmallWidget({
  name: 'Puro Llano Mini',
  description: 'Muestra el estado de la radio',
  minWidth: 1,
  minHeight: 1,
  updatePeriodMillis: 60000, // Actualizar cada minuto
  previewImage: 'widget_preview_small.png',
  initialLayout: {
    type: 'linear',
    orientation: 'vertical',
    children: [
      {
        type: 'text',
        text: 'Puro Llano',
        textSize: 12,
        textColor: '#fed202',
        gravity: 'center'
      },
      {
        type: 'text',
        text: '${status}',
        textSize: 10,
        textColor: '#ffffff',
        gravity: 'center'
      }
    ]
  }
});

// Widget mediano (2x1)
widget.createMediumWidget({
  name: 'Puro Llano Player',
  description: 'Reproductor de radio con controles',
  minWidth: 2,
  minHeight: 1,
  updatePeriodMillis: 30000, // Actualizar cada 30 segundos
  previewImage: 'widget_preview_medium.png',
  initialLayout: {
    type: 'linear',
    orientation: 'vertical',
    children: [
      {
        type: 'linear',
        orientation: 'horizontal',
        children: [
          {
            type: 'image',
            src: 'https://purollanoradio.com/PUROLLANORADIO-COM-ICONO.png',
            width: 40,
            height: 40,
            gravity: 'center'
          },
          {
            type: 'linear',
            orientation: 'vertical',
            children: [
              {
                type: 'text',
                text: '${songTitle}',
                textSize: 12,
                textColor: '#ffffff',
                maxLines: 1,
                ellipsize: 'end'
              },
              {
                type: 'text',
                text: '${artistName}',
                textSize: 10,
                textColor: '#fed202',
                maxLines: 1,
                ellipsize: 'end'
              }
            ]
          }
        ]
      },
      {
        type: 'linear',
        orientation: 'horizontal',
        gravity: 'center',
        children: [
          {
            type: 'button',
            text: '⏸️',
            action: 'togglePlay',
            width: 40,
            height: 40
          }
        ]
      }
    ]
  }
});

// Widget grande (3x2)
widget.createLargeWidget({
  name: 'Puro Llano Dashboard',
  description: 'Dashboard completo de la radio',
  minWidth: 3,
  minHeight: 2,
  updatePeriodMillis: 15000, // Actualizar cada 15 segundos
  previewImage: 'widget_preview_large.png',
  initialLayout: {
    type: 'linear',
    orientation: 'vertical',
    children: [
      {
        type: 'linear',
        orientation: 'horizontal',
        children: [
          {
            type: 'image',
            src: 'https://purollanoradio.com/PUROLLANORADIO-COM-ICONO.png',
            width: 60,
            height: 60,
            gravity: 'center'
          },
          {
            type: 'linear',
            orientation: 'vertical',
            children: [
              {
                type: 'text',
                text: 'Puro Llano Radio',
                textSize: 16,
                textColor: '#fed202',
                fontWeight: 'bold'
              },
              {
                type: 'text',
                text: '${listeners} oyentes',
                textSize: 12,
                textColor: '#ffffff'
              },
              {
                type: 'text',
                text: '${status}',
                textSize: 10,
                textColor: '#2ecc71'
              }
            ]
          }
        ]
      },
      {
        type: 'text',
        text: '${songTitle}',
        textSize: 14,
        textColor: '#ffffff',
        maxLines: 1,
        ellipsize: 'end',
        marginTop: 10
      },
      {
        type: 'text',
        text: '${artistName}',
        textSize: 12,
        textColor: '#fed202',
        maxLines: 1,
        ellipsize: 'end'
      },
      {
        type: 'linear',
        orientation: 'horizontal',
        gravity: 'center',
        marginTop: 15,
        children: [
          {
            type: 'button',
            text: '⏮️',
            action: 'previous',
            width: 40,
            height: 40
          },
          {
            type: 'button',
            text: '${playIcon}',
            action: 'togglePlay',
            width: 50,
            height: 50
          },
          {
            type: 'button',
            text: '⏭️',
            action: 'next',
            width: 40,
            height: 40
          }
        ]
      }
    ]
  }
});

// Configuración del proveedor de datos
widget.setDataProvider({
  updateData: function() {
    // Obtener datos actuales de la radio
    return {
      status: 'En vivo',
      songTitle: 'Cargando...',
      artistName: 'Puro Llano Radio',
      listeners: '0',
      playIcon: '▶️'
    };
  },
  
  onAction: function(action) {
    switch(action) {
      case 'togglePlay':
        // Llamar a la función global de togglePlay
        if (typeof window.togglePlay === 'function') {
          window.togglePlay();
        }
        break;
      case 'previous':
        // Función para canción anterior
        console.log('Canción anterior');
        break;
      case 'next':
        // Función para siguiente canción
        console.log('Siguiente canción');
        break;
    }
  }
});

console.log('Widgets de Puro Llano Radio configurados');