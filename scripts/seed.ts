const { PrismaClient } = require("@prisma/client");

const database = new PrismaClient();

async function main() {
    try {
        await database.category.createMany({
            data: [
                { name: "Informatique" },
                { name: "Musique" },
                { name: "Fitness" },
                { name: "Photographie" },
                { name: "Comptabilité" },
                { name: "Ingénieur" },
                { name: "Monteur vidéo" }
            ]
        })
        console.log("Success")
    } catch (error) {
        console.log("Une erreur s'est produite lors de l'envoi de catégories à la base de donnée", error)
    } finally {
        await database.$disconnect()
    }
}

main()