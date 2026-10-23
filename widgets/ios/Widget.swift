//
//  PuroLlanoWidget.swift
//  Puro Llano Radio Widget
//
//  Widget para iOS que muestra el estado de la radio
//

import WidgetKit
import SwiftUI
import Intents

// Modelo de datos para el widget
struct RadioStatus: Codable {
    let isPlaying: Bool
    let songTitle: String
    let artistName: String
    let listeners: Int
    let lastUpdate: Date
}

// Proveedor de timeline
struct Provider: IntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), status: RadioStatus(
            isPlaying: true,
            songTitle: "Joropo del Llano",
            artistName: "Puro Llano Radio",
            listeners: 42,
            lastUpdate: Date()
        ))
    }

    func getSnapshot(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), status: RadioStatus(
            isPlaying: true,
            songTitle: "Cargando...",
            artistName: "Puro Llano Radio",
            listeners: 0,
            lastUpdate: Date()
        ))
        completion(entry)
    }

    func getTimeline(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        var entries: [SimpleEntry] = []
        
        // Generar timeline para las próximas 24 horas
        let currentDate = Date()
        for hourOffset in 0 ..< 24 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate, status: RadioStatus(
                isPlaying: true,
                songTitle: "Música Llanera",
                artistName: "Puro Llano Radio",
                listeners: Int.random(in: 30...100),
                lastUpdate: entryDate
            ))
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

// Entrada del timeline
struct SimpleEntry: TimelineEntry {
    let date: Date
    let status: RadioStatus
}

// Vista del widget pequeño
struct PuroLlanoWidgetSmallView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack(spacing: 4) {
            Image("widget-icon")
                .resizable()
                .frame(width: 30, height: 30)
                .foregroundColor(.yellow)
            
            Text("Puro Llano")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text(entry.status.isPlaying ? "▶️" : "⏸️")
                .font(.caption2)
                .foregroundColor(.green)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }
}

// Vista del widget mediano
struct PuroLlanoWidgetMediumView: View {
    var entry: Provider.Entry

    var body: some View {
        HStack(spacing: 12) {
            Image("widget-icon")
                .resizable()
                .frame(width: 50, height: 50)
                .clipShape(Circle())
                .overlay(Circle().stroke(Color.yellow, lineWidth: 2))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.status.songTitle)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Text(entry.status.artistName)
                    .font(.subheadline)
                    .foregroundColor(.yellow)
                    .lineLimit(1)
                
                HStack {
                    Image(systemName: "headphones")
                        .foregroundColor(.green)
                    Text("\(entry.status.listeners) oyentes")
                        .font(.caption)
                        .foregroundColor(.white)
                }
            }
            
            Spacer()
            
            Button(action: {
                // Acción de toggle play
                if let url = URL(string: "purollano://togglePlay") {
                    WidgetCenter.shared.reloadTimelines(ofKind: "PuroLlanoWidget")
                }
            }) {
                Image(systemName: entry.status.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                    .font(.title2)
                    .foregroundColor(.yellow)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color.black, Color(red: 0.1, green: 0.07, blue: 0.03)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
}

// Vista del widget grande
struct PuroLlanoWidgetLargeView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack {
                Image("widget-icon")
                    .resizable()
                    .frame(width: 60, height: 60)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.yellow, lineWidth: 3))
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Puro Llano Radio")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.yellow)
                    
                    HStack {
                        Circle()
                            .fill(entry.status.isPlaying ? Color.green : Color.red)
                            .frame(width: 8, height: 8)
                        
                        Text(entry.status.isPlaying ? "EN VIVO" : "PAUSADO")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(entry.status.isPlaying ? .green : .red)
                    }
                    
                    Text("\(entry.status.listeners) oyentes conectados")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                }
                
                Spacer()
            }
            
            // Información de canción
            VStack(alignment: .leading, spacing: 4) {
                Text("Ahora suena:")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
                    .textCase(.uppercase)
                
                Text(entry.status.songTitle)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                Text(entry.status.artistName)
                    .font(.subheadline)
                    .foregroundColor(.yellow)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 8)
            
            // Controles
            HStack(spacing: 20) {
                Button(action: {
                    // Canción anterior
                    if let url = URL(string: "purollano://previous") {
                        WidgetCenter.shared.reloadTimelines(ofKind: "PuroLlanoWidget")
                    }
                }) {
                    Image(systemName: "backward.fill")
                        .font(.title2)
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(Color.gray.opacity(0.3))
                        .clipShape(Circle())
                }
                
                Button(action: {
                    // Toggle play/pause
                    if let url = URL(string: "purollano://togglePlay") {
                        WidgetCenter.shared.reloadTimelines(ofKind: "PuroLlanoWidget")
                    }
                }) {
                    Image(systemName: entry.status.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.yellow)
                }
                
                Button(action: {
                    // Siguiente canción
                    if let url = URL(string: "purollano://next") {
                        WidgetCenter.shared.reloadTimelines(ofKind: "PuroLlanoWidget")
                    }
                }) {
                    Image(systemName: "forward.fill")
                        .font(.title2)
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(Color.gray.opacity(0.3))
                        .clipShape(Circle())
                }
            }
            
            // Footer
            Text("Actualizado: \(entry.status.lastUpdate, style: .time)")
                .font(.caption2)
                .foregroundColor(.white.opacity(0.5))
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.1, green: 0.07, blue: 0.03),
                    Color.black
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
}

// Configuración del widget
@main
struct PuroLlanoWidget: Widget {
    let kind: String = "PuroLlanoWidget"

    var body: some WidgetConfiguration {
        IntentConfiguration(kind: kind, intent: ConfigurationIntent.self, provider: Provider()) { entry in
            PuroLlanoWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Puro Llano Radio")
        .description("Muestra el estado de la radio y controles de reproducción")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// Vista principal del widget
struct PuroLlanoWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            PuroLlanoWidgetSmallView(entry: entry)
        case .systemMedium:
            PuroLlanoWidgetMediumView(entry: entry)
        case .systemLarge:
            PuroLlanoWidgetLargeView(entry: entry)
        default:
            PuroLlanoWidgetMediumView(entry: entry)
        }
    }
}

// Vista previa
struct PuroLlanoWidget_Previews: PreviewProvider {
    static var previews: some View {
        PuroLlanoWidgetEntryView(entry: SimpleEntry(
            date: Date(),
            status: RadioStatus(
                isPlaying: true,
                songTitle: "El Gavilán Colorado",
                artistName: "Juan Vicente Torrealba",
                listeners: 87,
                lastUpdate: Date()
            )
        ))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
        .previewDisplayName("Widget Mediano")
    }
}