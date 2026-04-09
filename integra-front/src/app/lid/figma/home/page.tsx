import ProjectCard from "@/components/lid/figma/ProjectCard";

export default function HomePage() {
  return (
    <main className="pb-24 pt-40 md:pt-48">
      <div className="max-w-[1800px] mx-auto px-6 md:px-12">

        <div className="flex justify-center w-full mb-16 md:mb-24">
          <div className="bg-charcoal text-white px-8 py-4 md:px-12 md:py-5 border-l-4 border-lime shadow-2xl">
            <h2 className="text-sm md:text-base font-medium tracking-[0.2em] uppercase text-center">
              A luz, por várias perspectivas.
            </h2>
          </div>
        </div>

        {/* Hero Card */}
        <ProjectCard
          imageSrc="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop"
          title="Lorem ipsum"
          description="dolor sit amet"
          year="2025"
          boxPosition="bottom-left"
          className="mb-32 md:mb-48"
        />

        {/* Second Card - Offset right */}
        <div className="flex flex-col md:flex-row md:justify-end mb-32 md:mb-48">
          <div className="w-full md:w-3/4">
            <ProjectCard
              imageSrc="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000&auto=format&fit=crop"
              title="Lorem ipsum"
              description="dolor sit amet"
              year="2025"
              boxPosition="top-left"
            />
            <div className="mt-8 md:mt-16 md:ml-[350px] max-w-lg">
              <p className="text-lg md:text-xl font-light leading-relaxed mb-6">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec vel sapien eget nunc gravida tincidunt. Sed at ligula quis sapien efficitur varius.
              </p>
              <button className="bg-charcoal text-white px-6 py-3 text-sm hover:bg-black transition-colors">
                Ver Galeria
              </button>
            </div>
          </div>
        </div>

        {/* Two Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8 mb-32 md:mb-48">
          <ProjectCard
            imageSrc="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000&auto=format&fit=crop"
            title="Lorem ipsum"
            description="dolor sit amet"
            year="2025"
            boxPosition="top-left"
          />
          <div className="md:mt-32">
            <ProjectCard
              imageSrc="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop"
              title="Lorem ipsum"
              description="dolor sit amet"
              year="2025"
              boxPosition="top-left"
            />
          </div>
        </div>

      </div>
    </main>
  );
}