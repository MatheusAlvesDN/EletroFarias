interface ProjectCardProps {
  imageSrc: string;
  title: string;
  description: string;
  year: string;
  boxPosition?: 'top-left' | 'bottom-left' | 'center-left';
  className?: string;
}

export default function ProjectCard({ 
  imageSrc, 
  title, 
  description, 
  year, 
  boxPosition = 'top-left',
  className = ''
}: ProjectCardProps) {
  
  // Lógica para posicionar a caixa preta no desktop
  const positionClasses = {
    'top-left': 'md:-top-8 md:-left-8',
    'bottom-left': 'md:-bottom-8 md:-left-8',
    'center-left': 'md:top-1/2 md:-translate-y-1/2 md:-left-8',
  };

  return (
    <div className={`relative flex flex-col md:block ${className}`}>
      {/* Imagem */}
      <div className="w-full h-[60vh] md:h-[80vh] bg-gray-200">
        <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
      </div>

      {/* Caixa Escura (Mobile: Embaixo / Desktop: Sobreposta absoluta) */}
      <div className={`
        bg-charcoal text-white p-6 md:p-8 
        flex flex-col justify-between
        h-[250px] w-full md:w-[350px] 
        md:absolute ${positionClasses[boxPosition]} z-10
      `}>
        <h3 className="text-lg md:text-xl font-medium pr-4">{title}</h3>
        <div>
          <p className="text-sm font-light text-gray-300 mb-1">{description}</p>
          <p className="text-sm">{year}</p>
        </div>
      </div>
    </div>
  );
}