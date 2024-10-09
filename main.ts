import { DOMParser, XMLSerializer } from 'xmldom';
import xpath from 'xpath';
import * as fs from 'fs';
import * as path from 'path';

async function jobArrived(s: Switch, flowElement: FlowElement, job: Job) {
    const dataset = "Xml";
    try {
        // Récupération du chemin du dataset XML et conversion en chaîne
        const datasetPathPromise = job.getDataset(dataset, AccessLevel.ReadOnly);
        const datasetPath = await datasetPathPromise as string; // Conversion en chaîne de caractères

        // Lecture du contenu du fichier dataset de manière asynchrone en utilisant 'fs.promises'
        const xmlContent = await fs.promises.readFile(datasetPath, 'utf-8');

        // Parse le contenu du fichier en tant que document XML
        const doc = new DOMParser().parseFromString(xmlContent, 'text/xml');

        const timestamp = Date.now(); // Utilisation de l'horodatage en millisecondes pour des titres unique


        // Utilisation de l'expression XPath pour récupérer tous les `line_items`
        const lineItemsNodes = xpath.select("/line_items_collection/line_items", doc);

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
                const newDoc = new DOMParser().parseFromString('<line_items_collection></line_items_collection>', 'text/xml');
                const root = newDoc.documentElement;

                // Importer le `line_items` courant dans le nouveau document
                const importedNode = newDoc.importNode(node as Node, true);
                root.appendChild(importedNode);

                // Générer le contenu XML à partir du document
                const xmlString = new XMLSerializer().serializeToString(newDoc);

                // Nom de fichier pour chaque `line_items`
                const fileName = `line_item_${index}_${timestamp}.xml`;
                const filePath = path.join(userDesktopPath, fileName);

                // Enregistrer le contenu XML dans un nouveau fichier de manière asynchrone
                await fs.promises.writeFile(filePath, xmlString, 'utf-8');

                // Créer un nouveau job avec le fichier XML distinct et l'envoyer
                const newJob = await job.createChild(filePath);  // Utilisez 'createChild' au lieu de 'createChildJob'
                
                // Envoyer le nouveau job au dossier suivant
                await newJob.sendToSingle();

                // Log pour indiquer le fichier créé
                await job.log(LogLevel.Info, `Created and sent new job: ${filePath}`);
                
                index++;
            }
        } else {
            await job.log(LogLevel.Warning, "No line_items found in the XML document.");
        }

        // Marquer le job actuel comme complété
        await job.sendToSingle();
    } catch (error: any) {
        await job.log(LogLevel.Error, "An error occurred: " + error.message);
    }
}
