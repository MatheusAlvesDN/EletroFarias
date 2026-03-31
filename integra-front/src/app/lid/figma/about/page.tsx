import ProjectCard from "@/components/lid/ProjectCard";

export default function AboutPage() {
    return (
        <main className="pt-48 md:pt-56 pb-24 max-w-[1600px] mx-auto px-4 md:px-8 min-h-screen">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32">
                <div className="text-2xl md:text-4xl font-light leading-snug">
                    Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua
                </div>

                <div className="space-y-8 text-base md:text-lg text-graytext font-light">
                    <p>
                        Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua
                    </p>
                    <div className="bg-charcoal text-white p-8 md:p-12 mt-12">
                        <h2 className="text-xl mb-4 font-medium">Lorem Ipsum</h2>
                        <p className="opacity-80">
                            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua
                        </p>
                    </div>
                </div>
                <ProjectCard
                    imageSrc="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop"
                    title="Lorem ipsum"
                    description="dolor sit amet"
                    year="2025"
                    boxPosition="bottom-left"
                    className="mb-32 md:mb-48"
                />
                <ProjectCard
                    imageSrc="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000&auto=format&fit=crop"
                    title="Lorem ipsum"
                    description="dolor sit amet"
                    year="2025"
                    boxPosition="bottom-left"
                    className="mb-32 md:mb-48"
                />
            </div>
        </main>
    );
}