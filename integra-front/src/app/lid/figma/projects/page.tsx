import ProjectCard from "@/components/lid/figma/ProjectCard";

export default function ProjectsPage() {
  return (
    <main className="pt-48 md:pt-56 pb-24 max-w-[1600px] mx-auto px-4 md:px-8">
      <h1 className="text-3xl md:text-5xl font-medium mb-24">Portfólio Selecionado</h1>

      <div className="space-y-32 md:space-y-48">
        <ProjectCard
          imageSrc="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000&auto=format&fit=crop"
          title="Lorem ipsum"
          description="dolor sit amet"
          year="2024"
          boxPosition="top-left"
        />

        <div className="md:w-4/5 md:ml-auto">
          <ProjectCard
            imageSrc="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000&auto=format&fit=crop"
            title="Lorem ipsum"
            description="dolor sit amet"
            year="2024"
            boxPosition="center-left"
          />
        </div>

        <ProjectCard
          imageSrc="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop"
          title="Lorem ipsum"
          description="dolor sit amet"
          year="2023"
          boxPosition="bottom-left"
        />
      </div>
    </main>
  );
}