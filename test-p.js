async function run() {
  const processNotesInChunks = async (notes, processFn) => {
      const chunkSize = 50;
      for (let i = 0; i < notes.length; i += chunkSize) {
          const chunk = notes.slice(i, i + chunkSize);
          await Promise.all(chunk.map(processFn));
      }
  };
  console.log("Done");
}
run();
