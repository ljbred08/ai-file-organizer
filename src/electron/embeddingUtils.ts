// src/electron/embeddingUtils.ts  
  
import Replicate from 'replicate';   
// Add import for Voyage SDK  
import { VoyageAIClient } from 'voyageai';  
  
// Initialize Voyage client - you'll need to set VOYAGE_API_KEY in your environment  
const voyageClient = new VoyageAIClient({   
  apiKey: process.env.VOYAGE_API_KEY  
});  
  
 
  
// For Voyage text embedding models  
export async function getVoyageTextEmbedding(input: string): Promise<number[]> {  
  try {  
    // Ensure input is a string  
    if (typeof input !== 'string') {  
      throw new Error("Voyage text embedding requires a string input");  
    }  
      
    const response = await voyageClient.embed({  
      input: input, // This must be a string or array of strings  
      model: "voyage-large-2",  
    });  
      
    // Return the first embedding from the response  
    if (response.data && response.data.length > 0 && response.data[0].embedding) {  
      return response.data[0].embedding;  
    }  
    return [];  
  } catch (error) {  
    console.error(`[getVoyageTextEmbedding] Error:`, error);  
    return [];  
  }  
}  
  
// For Voyage multimodal embedding models  
export async function getVoyageMultimodalEmbedding(  
  input: Buffer | string,   
  modality: "vision" | "text"  
): Promise<number[]> {  
  try {  
    let contentItem;  
      
    if (modality === "text") {  
      if (typeof input !== 'string') {  
        console.error("Text modality requires a string input");
        if (Buffer.isBuffer(input)) {
          input = input.toString('utf8');
        } else {
          throw new Error("Text modality requires a string or Buffer input");
        } 
      }  
      contentItem = {  
        type: "text",  
        text: input  
      };  
    } else if (modality === "vision") {  
      if (!Buffer.isBuffer(input)) {  
        throw new Error("Vision modality requires a Buffer input");  
      }  
      // Convert Buffer to base64 string for image  
      const base64Image = input.toString('base64');  
      contentItem = {  
        type: "image_base64",  
        imageBase64: `data:image/jpeg;base64,${base64Image}`  
      };  
    } else {  
      throw new Error("Unsupported modality");  
    }  
      
    const response = await voyageClient.multimodalEmbed({  
      inputs: [{  
        content: [contentItem]  
      }],  
      model: "voyage-multimodal-3"  
    });  
      
    // Return the first embedding from the response  
    if (response.data && response.data.length > 0 && response.data[0].embedding) {  
      return response.data[0].embedding;  
    }  
    return [];  
  } catch (error) {  
    console.error(`[getVoyageMultimodalEmbedding] Error:`, error);  
    return [];  
  }  
}  
  
// Main function: delegates to the correct model-specific function  
export async function getEmbedding({  
  input,  
  modality,  
  model = "voyage-multimodal-3"  
}: {  
  input: Buffer | string,  
  modality: string,  
  model?: string  
}): Promise<any> {  
  let output: any;  

  if (model.startsWith("zsxkib/jina-clip-v2")) {  
    output = await getJinaClipEmbedding(input, modality as "vision" | "text");  
  } else if (model.startsWith("daanelson/imagebind")) {  
    output = await getImageBindEmbedding(input as Buffer, modality);  
  } else if (model === "voyage-multimodal-3") {  
    // For multimodal Voyage model  
    output = await getVoyageMultimodalEmbedding(input, modality as "vision" | "text");  
  } else if (model.startsWith("voyage-") && modality === "text") {  
    // For text-only Voyage models  
    if (typeof input !== 'string') {  
      console.error("Voyage text embedding requires a string input");  
      output = await getVoyageTextEmbedding(input.toString('utf8'));  
    } else {  
      output = await getVoyageTextEmbedding(input);  
    }  
  } else {  
    throw new Error("Unknown model");  
  }  
  // Flatten if output is a 2D array (e.g., [[...]])  
  if (Array.isArray(output) && Array.isArray(output[0])) {  
    return output[0];  
  }  
  return output;  
}













// For the jina-clip-v2 model  
export async function getJinaClipEmbedding(input: Buffer | string, modality: "vision" | "text"): Promise<any> {  
  const model = "zsxkib/jina-clip-v2:5050c3108bab23981802011a3c76ee327cc0dbfdd31a2f4ef1ee8ef0d3f0b448";  
  try {  
    const replicate = new Replicate();  
    let modelInput: any;  
    if (modality === "vision") {  
      modelInput = { image: input, output_format: "array", embedding_dim: 1024 };  
    } else if (modality === "text") {  
      modelInput = { text: input, output_format: "array", embedding_dim: 1024 };  
    } else {  
      throw new Error("Unsupported modality");  
    }  
    // Wrap modelInput in an 'input' object as required by the API  
    const output = await replicate.run(model, { input: modelInput});  
    return output;  
  } catch (error) {  
    console.error(`[getJinaClipEmbedding] Error:`, error);  
    return [];  
  }  
}  

// For the imagebind model  
export async function getImageBindEmbedding(input: Buffer, modality: string): Promise<number[]> {  
const model = "daanelson/imagebind:0383f62e173dc821ec52663ed22a076d9c970549c209666ac3db181618b7a304";  
try {  
  const replicate = new Replicate();  
  const output = await replicate.run(  
    model,  
    { input: { input, modality } }  
  );  
  return Array.isArray(output) ? output : [];  
} catch (error) {  
  console.error(`[getImageBindEmbedding] Error:`, error);  
  return [];  
}  
} 