"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const xmldom_1 = require("xmldom");
const xpath_1 = __importDefault(require("xpath"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function jobArrived(s, flowElement, job) {
    const dataset = "Xml";
    try {
        // Récupération du chemin du dataset XML et conversion en chaîne
        const datasetPathPromise = job.getDataset(dataset, AccessLevel.ReadOnly);
        const datasetPath = await datasetPathPromise; // Conversion en chaîne de caractères
        // Lecture du contenu du fichier dataset de manière asynchrone en utilisant 'fs.promises'
        const xmlContent = await fs.promises.readFile(datasetPath, 'utf-8');
        // Parse le contenu du fichier en tant que document XML
        const doc = new xmldom_1.DOMParser().parseFromString(xmlContent, 'text/xml');
        const timestamp = Date.now(); // Utilisation de l'horodatage en millisecondes pour des titres unique
        // Utilisation de l'expression XPath pour récupérer tous les `line_items`
        const lineItemsNodes = xpath_1.default.select("/line_items_collection/line_items", doc);
        // Vérifier que lineItemsNodes est bien un tableau
        if (Array.isArray(lineItemsNodes)) {
            // Chemin vers le bureau Windows de l'utilisateur
            const userDesktopPath = path.join(process.env.USERPROFILE || "", 'Desktop', 'TempXMLFiles');
            // Créer le dossier temporaire sur le bureau de manière asynchrone s'il n'existe pas
            await fs.promises.mkdir(userDesktopPath, { recursive: true });
            // Parcourir chaque `line_items` et créer un fichier XML distinct
            let index = 1;
            for (const node of lineItemsNodes) {
                // Créer un nouveau document XML avec le `line_items` courant
                const newDoc = new xmldom_1.DOMParser().parseFromString('<line_items_collection></line_items_collection>', 'text/xml');
                const root = newDoc.documentElement;
                // Importer le `line_items` courant dans le nouveau document
                const importedNode = newDoc.importNode(node, true);
                root.appendChild(importedNode);
                // Générer le contenu XML à partir du document
                const xmlString = new xmldom_1.XMLSerializer().serializeToString(newDoc);
                // Nom de fichier pour chaque `line_items`
                const fileName = `line_item_${index}_${timestamp}.xml`;
                const filePath = path.join(userDesktopPath, fileName);
                // Enregistrer le contenu XML dans un nouveau fichier de manière asynchrone
                await fs.promises.writeFile(filePath, xmlString, 'utf-8');
                // Créer un nouveau job avec le fichier XML distinct et l'envoyer
                const newJob = await job.createChild(filePath); // Utilisez 'createChild' au lieu de 'createChildJob'
                // Envoyer le nouveau job au dossier suivant
                await newJob.sendToSingle();
                // Log pour indiquer le fichier créé
                await job.log(LogLevel.Info, `Created and sent new job: ${filePath}`);
                index++;
            }
        }
        else {
            await job.log(LogLevel.Warning, "No line_items found in the XML document.");
        }
        // Marquer le job actuel comme complété
        await job.sendToSingle();
    }
    catch (error) {
        await job.log(LogLevel.Error, "An error occurred: " + error.message);
    }
}
//# sourceMappingURL=main.js.map