export const ignoreFieldsForModel = [
  {
    model: "o3-mini",
    fields: ["topP", "temperature"],    
    prefix: "o3-mini",
  }  
]

export const fieldsForMCPServer = [
  "transport",
  "url",
  "serverFileLocation",
]