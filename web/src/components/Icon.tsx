// Ícones em SVG que herdam a cor do texto (stroke="currentColor").
// São decorativos: o texto ou o aria-label do controle diz o que ele faz.
const PATHS = {
  inicio: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  produtos: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5 12 12l9-4.5M12 12v9',
  vendas: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6M9 16h4',
  pedidos: 'M8 4h8v3H8zM6 5.5H4V21h16V5.5h-2M8 12h8M8 16h5',
  catalogo: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
  mensagens: 'M4 4h16v12H8l-4 4z',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  usuarios: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c2.5.5 4 2.3 4 5.5',
  resumo: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  sol: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  lua: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  sair: 'M15 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  fechar: 'M6 6l12 12M18 6 6 18',
  voltar: 'M15 5l-7 7 7 7',
  avancar: 'M9 5l7 7-7 7',
  mais: 'M12 5v14M5 12h14',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  lixeira: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  imagem: 'M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  check: 'M4 12.5 9 17.5 20 6.5',
  enviar: 'M3 11 21 3l-8 18-2-8z',
  estrela: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  busca: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.8-4.8',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 18, fill }: { name: IconName; size?: number; fill?: boolean }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
