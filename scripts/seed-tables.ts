/**
 * scripts/seed-tables.ts
 *
 * Seeds quotes, books, students, resumes, and animals with locale-specific
 * fake data for all 6 locales: en, fr, es, sr, de, mk.
 *
 * Run: pnpm tsx scripts/seed-tables.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   LOCALE_ADMIN_EN / _FR / _ES / _SR / _DE / _MK
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(process.cwd(), ".env") })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const localeAdmins: Record<string, string | undefined> = {
  en: process.env.LOCALE_ADMIN_EN,
  fr: process.env.LOCALE_ADMIN_FR,
  es: process.env.LOCALE_ADMIN_ES,
  sr: process.env.LOCALE_ADMIN_SR,
  de: process.env.LOCALE_ADMIN_DE,
  mk: process.env.LOCALE_ADMIN_MK,
}

async function seedTable(table: string, locale: string, adminId: string, rows: object[]) {
  const payload = rows.map(data => ({ user_id: adminId, locale, is_system: true, data }))
  const { error } = await supabase.from(table).insert(payload)
  if (error) console.error(`  ✗ ${table}/${locale}:`, error.message)
  else       console.log(`  ✓ ${table}/${locale}: ${rows.length} rows`)
}

// ─── QUOTES ──────────────────────────────────────────────────────────────────

const quotes: Record<string, object[]> = {
  en: [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "motivation", year: 2005 },
    { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein", category: "wisdom" },
    { text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.", author: "Albert Einstein", category: "humor" },
    { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien", source: "The Fellowship of the Ring", category: "wisdom", year: 1954 },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "motivation" },
    { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", category: "motivation" },
    { text: "Imagination is more important than knowledge.", author: "Albert Einstein", category: "science" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb", category: "wisdom" },
    { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon", category: "philosophy", year: 1980 },
    { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln", category: "philosophy" },
    { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela", category: "motivation" },
    { text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson", category: "philosophy" },
  ],
  fr: [
    { text: "Je pense, donc je suis.", author: "René Descartes", category: "philosophy", year: 1637, source: "Discours de la méthode" },
    { text: "L'enfer, c'est les autres.", author: "Jean-Paul Sartre", source: "Huis Clos", category: "philosophy", year: 1944 },
    { text: "Il faut imaginer Sisyphe heureux.", author: "Albert Camus", source: "Le mythe de Sisyphe", category: "philosophy", year: 1942 },
    { text: "On ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux.", author: "Antoine de Saint-Exupéry", source: "Le Petit Prince", category: "wisdom", year: 1943 },
    { text: "Le cœur a ses raisons que la raison ne connaît point.", author: "Blaise Pascal", source: "Pensées", category: "love", year: 1670 },
    { text: "Celui qui ouvre une porte d'école, ferme une prison.", author: "Victor Hugo", category: "wisdom" },
    { text: "La vie est courte, l'art est long.", author: "Hippocrate", category: "wisdom" },
    { text: "Pour vivre heureux, vivons cachés.", author: "Jean-Pierre Claris de Florian", category: "philosophy" },
    { text: "Aimer, c'est trouver sa richesse hors de soi.", author: "Barbey d'Aurevilly", category: "love" },
    { text: "La liberté des uns s'arrête là où commence celle des autres.", author: "Jean-Paul Sartre", category: "philosophy" },
    { text: "Un ami, c'est quelqu'un qui vous connaît bien et qui vous aime quand même.", author: "Elbert Hubbard", category: "love" },
    { text: "Phantasie ist wichtiger als Wissen.", author: "Albert Einstein", category: "science" },
  ],
  es: [
    { text: "El camino se hace al andar.", author: "Antonio Machado", source: "Proverbios y cantares", category: "wisdom" },
    { text: "La vida es sueño y los sueños, sueños son.", author: "Pedro Calderón de la Barca", source: "La vida es sueño", category: "philosophy", year: 1635 },
    { text: "Prefiero morir de pie que vivir de rodillas.", author: "Emiliano Zapata", category: "motivation" },
    { text: "Solo sé que no sé nada.", author: "Sócrates", category: "philosophy" },
    { text: "Puedo resistir todo menos la tentación.", author: "Oscar Wilde", category: "humor" },
    { text: "El que no arriesga no gana.", author: "Refrán español", category: "motivation" },
    { text: "Amor es un arte; como todo arte requiere conocimiento y esfuerzo.", author: "Erich Fromm", source: "El arte de amar", category: "love", year: 1956 },
    { text: "Ser o no ser, esa es la cuestión.", author: "William Shakespeare", source: "Hamlet", category: "philosophy" },
    { text: "Dime con quién andas y te diré quién eres.", author: "Miguel de Cervantes", category: "wisdom" },
    { text: "No hay atajo que no tenga su trabajo.", author: "Refrán español", category: "wisdom" },
    { text: "La esperanza es el sueño del hombre despierto.", author: "Aristóteles", category: "philosophy" },
    { text: "El que madruga, Dios le ayuda.", author: "Refrán español", category: "motivation" },
  ],
  sr: [
    { text: "Sve se može, ako se hoće.", author: "Srpska poslovica", category: "motivation" },
    { text: "Bolje vrabac u ruci, nego golub na grani.", author: "Srpska poslovica", category: "wisdom" },
    { text: "Ko ne riskira, ne profitira.", author: "Srpska poslovica", category: "motivation" },
    { text: "Nije zlato sve što sija.", author: "Srpska poslovica", category: "wisdom" },
    { text: "Mudriji popušta.", author: "Srpska poslovica", category: "wisdom" },
    { text: "Nauka je sila.", author: "Nikola Tesla", category: "science" },
    { text: "Sloboda je dragocjenija od zlata.", author: "Srpska izreka", category: "philosophy" },
    { text: "Ne odgađaj za sutra ono što možeš danas.", author: "Benjamin Franklin", category: "motivation" },
    { text: "Mala djeca, mala muka; velika djeca, velika muka.", author: "Srpska poslovica", category: "humor" },
    { text: "Čovjek koji nema ništa za što živi, ne vrijedi ništa.", author: "Srpska izreka", category: "philosophy" },
    { text: "Ko se maši tuđeg, gubi svoje.", author: "Srpska poslovica", category: "wisdom" },
    { text: "Teška je glava koja krunu nosi.", author: "William Shakespeare (prevod)", source: "Henrik IV", category: "philosophy" },
  ],
  de: [
    { text: "Was mich nicht umbringt, macht mich stärker.", author: "Friedrich Nietzsche", source: "Götzen-Dämmerung", category: "motivation", year: 1888 },
    { text: "Glück ist das einzige, das sich verdoppelt, wenn man es teilt.", author: "Albert Schweitzer", category: "wisdom" },
    { text: "In der Beschränkung zeigt sich der Meister.", author: "Johann Wolfgang von Goethe", source: "Das Sonett", category: "wisdom" },
    { text: "Alle Theorie ist grau, mein Freund; doch grün des Lebens goldner Baum.", author: "Johann Wolfgang von Goethe", source: "Faust", category: "philosophy", year: 1808 },
    { text: "Wer kämpft, kann verlieren. Wer nicht kämpft, hat bereits verloren.", author: "Bertolt Brecht", category: "motivation" },
    { text: "Die Sprache ist das Haus des Seins.", author: "Martin Heidegger", category: "philosophy" },
    { text: "Phantasie ist wichtiger als Wissen, denn Wissen ist begrenzt.", author: "Albert Einstein", category: "science" },
    { text: "Der Mensch ist das einzige Tier, das lügt und lachen kann.", author: "Konrad Lorenz", category: "humor" },
    { text: "Man sieht nur mit dem Herzen gut.", author: "Antoine de Saint-Exupéry", source: "Der Kleine Prinz", category: "love", year: 1943 },
    { text: "Lernen ohne zu denken ist verlorene Mühe.", author: "Konfuzius", category: "wisdom" },
    { text: "Ein Mensch, der keine Zeit hat, sein Leben zu leben, ist wie ein Arbeiter, der keine Zeit hat, seine Werkzeuge zu schärfen.", author: "Abraham Lincoln", category: "philosophy" },
    { text: "Es ist nicht genug zu wissen, man muss auch anwenden.", author: "Johann Wolfgang von Goethe", category: "motivation" },
  ],
  mk: [
    { text: "Не оди по патот каде одат сите, туку оди каде нема никој и остави трага.", author: "Македонска изрека", category: "motivation" },
    { text: "Знаењето е сила.", author: "Francis Bacon (превод)", category: "wisdom" },
    { text: "Едно добро дело е подобро од илјада добри зборови.", author: "Македонска изрека", category: "motivation" },
    { text: "Чекај и ќе дочекаш.", author: "Македонска пословица", category: "wisdom" },
    { text: "Побрзај бавно.", author: "Македонска пословица", category: "wisdom" },
    { text: "Среќата е кога мислите, зборовите и делата се во склад.", author: "Махатма Ганди (превод)", category: "philosophy" },
    { text: "Биди промената што сакаш да ја видиш во светот.", author: "Махатма Ганди (превод)", category: "motivation" },
    { text: "Смеата е најдобрата лекарство.", author: "Македонска изрека", category: "humor" },
    { text: "Вистинскиот пријател е оној кој те познава и сепак те сака.", author: "Македонска изрека", category: "love" },
    { text: "Науката нема татковина, а научникот ја има.", author: "Louis Pasteur (превод)", category: "science" },
    { text: "Доброто дело наоѓа свој пат.", author: "Македонска пословица", category: "wisdom" },
    { text: "Најголемата слобода е слободата на мислите.", author: "Македонска изрека", category: "philosophy" },
  ],
}

// ─── BOOKS ───────────────────────────────────────────────────────────────────

const books: Record<string, object[]> = {
  en: [
    { title: "To Kill a Mockingbird", author: "Harper Lee", genre: "fiction", year: 1960, pages: 281, rating: 4.8, language: "English", description: "A story of racial injustice and moral growth in the American South." },
    { title: "1984", author: "George Orwell", genre: "fiction", year: 1949, pages: 328, rating: 4.7, language: "English", description: "A dystopian novel about totalitarianism, surveillance, and thought control." },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "fiction", year: 1925, pages: 180, rating: 4.3, language: "English", description: "A critique of the American Dream set in the Jazz Age." },
    { title: "A Brief History of Time", author: "Stephen Hawking", genre: "science", year: 1988, pages: 212, rating: 4.5, language: "English", description: "Cosmology explained for the general reader." },
    { title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", genre: "sci-fi", year: 1979, pages: 193, rating: 4.6, language: "English" },
    { title: "Sapiens", author: "Yuval Noah Harari", genre: "history", year: 2011, pages: 443, rating: 4.7, language: "English", description: "A brief history of humankind from the Stone Age to the modern era." },
    { title: "Atomic Habits", author: "James Clear", genre: "non-fiction", year: 2018, pages: 320, rating: 4.8, language: "English", description: "Proven strategies for building good habits and breaking bad ones." },
    { title: "Dune", author: "Frank Herbert", genre: "sci-fi", year: 1965, pages: 688, rating: 4.7, language: "English", description: "An epic tale of politics, religion, and ecology on a desert planet." },
    { title: "The Lord of the Rings", author: "J.R.R. Tolkien", genre: "fantasy", year: 1954, pages: 1178, rating: 4.9, language: "English" },
    { title: "The Pragmatic Programmer", author: "David Thomas & Andrew Hunt", genre: "non-fiction", year: 1999, pages: 352, rating: 4.7, language: "English", description: "Timeless advice for software developers." },
    { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", genre: "science", year: 2011, pages: 499, rating: 4.5, language: "English" },
    { title: "The Psychology of Money", author: "Morgan Housel", genre: "non-fiction", year: 2020, pages: 252, rating: 4.7, language: "English" },
    { title: "Harry Potter and the Philosopher's Stone", author: "J.K. Rowling", genre: "fantasy", year: 1997, pages: 223, rating: 4.8, language: "English" },
    { title: "Crime and Punishment", author: "Fyodor Dostoevsky", genre: "fiction", year: 1866, pages: 551, rating: 4.6, language: "English" },
    { title: "Clean Code", author: "Robert C. Martin", genre: "non-fiction", year: 2008, pages: 431, rating: 4.4, language: "English", description: "A handbook of agile software craftsmanship." },
  ],
  fr: [
    { title: "Les Misérables", author: "Victor Hugo", genre: "fiction", year: 1862, pages: 1232, rating: 4.8, language: "French", description: "L'épopée de Jean Valjean et de la lutte pour la justice sociale." },
    { title: "L'Étranger", author: "Albert Camus", genre: "fiction", year: 1942, pages: 159, rating: 4.5, language: "French", description: "L'histoire de Meursault, un homme indifférent au monde qui l'entoure." },
    { title: "Le Petit Prince", author: "Antoine de Saint-Exupéry", genre: "fiction", year: 1943, pages: 96, rating: 4.9, language: "French", description: "Un conte poétique sur l'amitié, l'amour et la perte de l'enfance." },
    { title: "Madame Bovary", author: "Gustave Flaubert", genre: "fiction", year: 1857, pages: 392, rating: 4.4, language: "French" },
    { title: "Candide", author: "Voltaire", genre: "fiction", year: 1759, pages: 144, rating: 4.3, language: "French", description: "Une satire mordante de l'optimisme philosophique." },
    { title: "Les Fleurs du mal", author: "Charles Baudelaire", genre: "fiction", year: 1857, pages: 234, rating: 4.5, language: "French" },
    { title: "Germinal", author: "Émile Zola", genre: "fiction", year: 1885, pages: 591, rating: 4.5, language: "French", description: "La vie des mineurs dans le nord de la France au XIXe siècle." },
    { title: "Le rouge et le noir", author: "Stendhal", genre: "fiction", year: 1830, pages: 503, rating: 4.3, language: "French" },
    { title: "Bonjour Tristesse", author: "Françoise Sagan", genre: "romance", year: 1954, pages: 127, rating: 4.0, language: "French" },
    { title: "La Nausée", author: "Jean-Paul Sartre", genre: "fiction", year: 1938, pages: 253, rating: 4.2, language: "French" },
    { title: "Cyrano de Bergerac", author: "Edmond Rostand", genre: "fiction", year: 1897, pages: 176, rating: 4.5, language: "French" },
    { title: "L'Amant", author: "Marguerite Duras", genre: "romance", year: 1984, pages: 117, rating: 4.1, language: "French" },
    { title: "À rebours", author: "Joris-Karl Huysmans", genre: "fiction", year: 1884, pages: 266, rating: 4.0, language: "French" },
    { title: "L'Assommoir", author: "Émile Zola", genre: "fiction", year: 1877, pages: 494, rating: 4.3, language: "French" },
    { title: "Rhinocéros", author: "Eugène Ionesco", genre: "fiction", year: 1959, pages: 144, rating: 4.2, language: "French" },
  ],
  es: [
    { title: "Cien años de soledad", author: "Gabriel García Márquez", genre: "fiction", year: 1967, pages: 417, rating: 4.8, language: "Spanish", description: "La saga de la familia Buendía a lo largo de siete generaciones." },
    { title: "Don Quijote de la Mancha", author: "Miguel de Cervantes", genre: "fiction", year: 1605, pages: 863, rating: 4.7, language: "Spanish", description: "Las aventuras del caballero andante don Quijote y su escudero Sancho." },
    { title: "El amor en los tiempos del cólera", author: "Gabriel García Márquez", genre: "romance", year: 1985, pages: 368, rating: 4.5, language: "Spanish" },
    { title: "La sombra del viento", author: "Carlos Ruiz Zafón", genre: "mystery", year: 2001, pages: 465, rating: 4.7, language: "Spanish" },
    { title: "Rayuela", author: "Julio Cortázar", genre: "fiction", year: 1963, pages: 635, rating: 4.5, language: "Spanish" },
    { title: "La casa de los espíritus", author: "Isabel Allende", genre: "fiction", year: 1982, pages: 433, rating: 4.6, language: "Spanish" },
    { title: "Ficciones", author: "Jorge Luis Borges", genre: "fiction", year: 1944, pages: 174, rating: 4.7, language: "Spanish" },
    { title: "El túnel", author: "Ernesto Sabato", genre: "fiction", year: 1948, pages: 148, rating: 4.4, language: "Spanish" },
    { title: "Como agua para chocolate", author: "Laura Esquivel", genre: "romance", year: 1989, pages: 246, rating: 4.3, language: "Spanish" },
    { title: "El aleph", author: "Jorge Luis Borges", genre: "fiction", year: 1949, pages: 171, rating: 4.7, language: "Spanish" },
    { title: "Veinte poemas de amor", author: "Pablo Neruda", genre: "fiction", year: 1924, pages: 72, rating: 4.7, language: "Spanish" },
    { title: "La ciudad y los perros", author: "Mario Vargas Llosa", genre: "fiction", year: 1963, pages: 365, rating: 4.5, language: "Spanish" },
    { title: "Poeta en Nueva York", author: "Federico García Lorca", genre: "fiction", year: 1940, pages: 200, rating: 4.5, language: "Spanish" },
    { title: "El laberinto de la soledad", author: "Octavio Paz", genre: "non-fiction", year: 1950, pages: 280, rating: 4.5, language: "Spanish" },
    { title: "Conversación en La Catedral", author: "Mario Vargas Llosa", genre: "fiction", year: 1969, pages: 601, rating: 4.5, language: "Spanish" },
  ],
  sr: [
    { title: "Na Drini ćuprija", author: "Ivo Andrić", genre: "fiction", year: 1945, pages: 318, rating: 4.8, language: "Serbian", description: "Hronika jednog mosta i naroda koji su živeli uz njega." },
    { title: "Derviš i smrt", author: "Meša Selimović", genre: "fiction", year: 1966, pages: 264, rating: 4.8, language: "Serbian" },
    { title: "Seobe", author: "Miloš Crnjanski", genre: "fiction", year: 1929, pages: 284, rating: 4.6, language: "Serbian" },
    { title: "Prokleta avlija", author: "Ivo Andrić", genre: "fiction", year: 1954, pages: 112, rating: 4.6, language: "Serbian" },
    { title: "Enciklopedija mrtvih", author: "Danilo Kiš", genre: "fiction", year: 1983, pages: 207, rating: 4.6, language: "Serbian" },
    { title: "Gorski vijenac", author: "Petar II Petrović Njegoš", genre: "fiction", year: 1847, pages: 200, rating: 4.7, language: "Serbian" },
    { title: "Nečista krv", author: "Bora Stanković", genre: "fiction", year: 1910, pages: 208, rating: 4.4, language: "Serbian" },
    { title: "Petrijin venac", author: "Dragoslav Mihailović", genre: "fiction", year: 1975, pages: 250, rating: 4.5, language: "Serbian" },
    { title: "Travnička hronika", author: "Ivo Andrić", genre: "fiction", year: 1945, pages: 440, rating: 4.7, language: "Serbian" },
    { title: "Hazardna čitanka", author: "David Albahari", genre: "fiction", year: 1997, pages: 242, rating: 4.3, language: "Serbian" },
    { title: "Mali princ", author: "Antoine de Saint-Exupéry", genre: "fiction", year: 1943, pages: 96, rating: 4.9, language: "Serbian" },
    { title: "1984", author: "George Orwell", genre: "fiction", year: 1949, pages: 328, rating: 4.7, language: "Serbian" },
    { title: "Sapijens", author: "Yuval Noah Harari", genre: "history", year: 2011, pages: 443, rating: 4.7, language: "Serbian" },
    { title: "Opsada crkve Sv. Spasa", author: "Goran Petrović", genre: "fiction", year: 1997, pages: 370, rating: 4.4, language: "Serbian" },
    { title: "Zov divljine", author: "Jack London", genre: "fiction", year: 1903, pages: 232, rating: 4.5, language: "Serbian" },
  ],
  de: [
    { title: "Faust", author: "Johann Wolfgang von Goethe", genre: "fiction", year: 1808, pages: 464, rating: 4.6, language: "German" },
    { title: "Der Prozess", author: "Franz Kafka", genre: "fiction", year: 1925, pages: 271, rating: 4.5, language: "German", description: "Ein Mann wird ohne Grund verhaftet und muss sich in einem absurden Prozess verteidigen." },
    { title: "Die Verwandlung", author: "Franz Kafka", genre: "fiction", year: 1915, pages: 128, rating: 4.5, language: "German" },
    { title: "Buddenbrooks", author: "Thomas Mann", genre: "fiction", year: 1901, pages: 793, rating: 4.5, language: "German" },
    { title: "Der Steppenwolf", author: "Hermann Hesse", genre: "fiction", year: 1927, pages: 237, rating: 4.4, language: "German" },
    { title: "Siddhartha", author: "Hermann Hesse", genre: "fiction", year: 1922, pages: 152, rating: 4.5, language: "German" },
    { title: "Das Parfum", author: "Patrick Süskind", genre: "thriller", year: 1985, pages: 263, rating: 4.5, language: "German" },
    { title: "Die Blechtrommel", author: "Günter Grass", genre: "fiction", year: 1959, pages: 592, rating: 4.4, language: "German" },
    { title: "Der Vorleser", author: "Bernhard Schlink", genre: "fiction", year: 1995, pages: 208, rating: 4.3, language: "German" },
    { title: "Demian", author: "Hermann Hesse", genre: "fiction", year: 1919, pages: 176, rating: 4.4, language: "German" },
    { title: "Also sprach Zarathustra", author: "Friedrich Nietzsche", genre: "philosophy", year: 1883, pages: 352, rating: 4.5, language: "German" },
    { title: "Der Kleine Prinz", author: "Antoine de Saint-Exupéry", genre: "fiction", year: 1943, pages: 96, rating: 4.9, language: "German" },
    { title: "Effi Briest", author: "Theodor Fontane", genre: "fiction", year: 1895, pages: 368, rating: 4.2, language: "German" },
    { title: "Die Leiden des jungen Werthers", author: "Johann Wolfgang von Goethe", genre: "romance", year: 1774, pages: 176, rating: 4.2, language: "German" },
    { title: "Nathan der Weise", author: "Gotthold Ephraim Lessing", genre: "fiction", year: 1779, pages: 144, rating: 4.2, language: "German" },
  ],
  mk: [
    { title: "Бели мугри", author: "Кочо Рацин", genre: "fiction", year: 1939, pages: 96, rating: 4.7, language: "Macedonian" },
    { title: "Малиот принц", author: "Antoine de Saint-Exupéry", genre: "fiction", year: 1943, pages: 96, rating: 4.9, language: "Macedonian" },
    { title: "1984", author: "George Orwell", genre: "fiction", year: 1949, pages: 328, rating: 4.7, language: "Macedonian" },
    { title: "Сто години самотија", author: "Gabriel García Márquez", genre: "fiction", year: 1967, pages: 417, rating: 4.8, language: "Macedonian" },
    { title: "Старецот и морето", author: "Ernest Hemingway", genre: "fiction", year: 1952, pages: 127, rating: 4.5, language: "Macedonian" },
    { title: "Сапиенс", author: "Yuval Noah Harari", genre: "history", year: 2011, pages: 443, rating: 4.7, language: "Macedonian" },
    { title: "Мајсторот и Маргарита", author: "Mikhail Bulgakov", genre: "fiction", year: 1967, pages: 448, rating: 4.9, language: "Macedonian" },
    { title: "Хари Потер и Каменот на мудроста", author: "J.K. Rowling", genre: "fantasy", year: 1997, pages: 223, rating: 4.8, language: "Macedonian" },
    { title: "Ковачите", author: "Живко Чинго", genre: "fiction", year: 1959, pages: 192, rating: 4.4, language: "Macedonian" },
    { title: "Пустина", author: "Блаже Конески", genre: "fiction", year: 1953, pages: 180, rating: 4.3, language: "Macedonian" },
    { title: "Господар на прстените", author: "J.R.R. Tolkien", genre: "fantasy", year: 1954, pages: 1178, rating: 4.9, language: "Macedonian" },
    { title: "Алхемичарот", author: "Paulo Coelho", genre: "fiction", year: 1988, pages: 208, rating: 4.4, language: "Macedonian" },
    { title: "Мали луѓе", author: "Fyodor Dostoevsky", genre: "fiction", year: 1846, pages: 224, rating: 4.3, language: "Macedonian" },
    { title: "Атлас се исправа", author: "Ayn Rand", genre: "fiction", year: 1957, pages: 1168, rating: 4.3, language: "Macedonian" },
    { title: "Процесот", author: "Franz Kafka", genre: "fiction", year: 1925, pages: 271, rating: 4.5, language: "Macedonian" },
  ],
}

// ─── STUDENTS ────────────────────────────────────────────────────────────────

const students: Record<string, object[]> = {
  en: [
    { firstName: "James", lastName: "Mitchell", studentId: "SEN2024001", email: "j.mitchell@greenwich.edu", age: 20, grade: "sophomore", gpa: 3.4, major: "Computer Science", minor: "Mathematics", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Data Structures", code: "CS201", credits: 3, letterGrade: "A" }, { name: "Calculus II", code: "MATH202", credits: 4, letterGrade: "B+" }] },
    { firstName: "Sophie", lastName: "Clarke", studentId: "SEN2024002", email: "s.clarke@greenwich.edu", age: 22, grade: "junior", gpa: 3.8, major: "Psychology", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Cognitive Psychology", code: "PSY301", credits: 3, letterGrade: "A" }, { name: "Research Methods", code: "PSY302", credits: 3, letterGrade: "A-" }] },
    { firstName: "Oliver", lastName: "Thompson", studentId: "SEN2024003", email: "o.thompson@greenwich.edu", age: 19, grade: "freshman", gpa: 3.1, major: "Mechanical Engineering", enrollmentYear: 2024, isActive: true, subjects: [{ name: "Engineering Fundamentals", code: "ENG101", credits: 3, letterGrade: "B+" }, { name: "Physics I", code: "PHY101", credits: 4, letterGrade: "B" }] },
    { firstName: "Emily", lastName: "Watson", studentId: "SEN2024004", email: "e.watson@greenwich.edu", age: 23, grade: "senior", gpa: 3.9, major: "Biology", minor: "Chemistry", enrollmentYear: 2021, isActive: true, subjects: [{ name: "Molecular Biology", code: "BIO401", credits: 3, letterGrade: "A" }] },
    { firstName: "Lucas", lastName: "Brown", studentId: "SEN2024005", email: "l.brown@greenwich.edu", age: 26, grade: "graduate", gpa: 3.7, major: "Data Science", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Machine Learning", code: "DS501", credits: 3, letterGrade: "A-" }] },
    { firstName: "Amelia", lastName: "Johnson", studentId: "SEN2024006", email: "a.johnson@greenwich.edu", age: 21, grade: "junior", gpa: 3.6, major: "Economics", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Microeconomics", code: "ECO301", credits: 3, letterGrade: "A" }] },
    { firstName: "Noah", lastName: "Davis", studentId: "SEN2024007", email: "n.davis@greenwich.edu", age: 20, grade: "sophomore", gpa: 2.9, major: "History", enrollmentYear: 2023, isActive: true, subjects: [{ name: "European History", code: "HIS201", credits: 3, letterGrade: "B" }] },
    { firstName: "Isabella", lastName: "Wilson", studentId: "SEN2024008", email: "i.wilson@greenwich.edu", age: 24, grade: "senior", gpa: 4.0, major: "Mathematics", enrollmentYear: 2021, isActive: true, subjects: [{ name: "Abstract Algebra", code: "MATH401", credits: 3, letterGrade: "A" }] },
    { firstName: "Ethan", lastName: "Moore", studentId: "SEN2024009", email: "e.moore@greenwich.edu", age: 29, grade: "phd", gpa: 3.9, major: "Physics", enrollmentYear: 2021, isActive: true, subjects: [{ name: "Quantum Field Theory", code: "PHY701", credits: 3, letterGrade: "A" }] },
    { firstName: "Charlotte", lastName: "Taylor", studentId: "SEN2024010", email: "c.taylor@greenwich.edu", age: 21, grade: "junior", gpa: 3.5, major: "Graphic Design", enrollmentYear: 2022, isActive: false, subjects: [{ name: "Typography", code: "ART301", credits: 3, letterGrade: "A" }] },
  ],
  fr: [
    { firstName: "Louis", lastName: "Dupont", studentId: "SFR2024001", email: "l.dupont@sorbonne.fr", age: 20, grade: "sophomore", gpa: 3.5, major: "Philosophie", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Épistémologie", code: "PHI201", credits: 4, letterGrade: "A" }, { name: "Logique formelle", code: "PHI202", credits: 3, letterGrade: "B+" }] },
    { firstName: "Camille", lastName: "Martin", studentId: "SFR2024002", email: "c.martin@sorbonne.fr", age: 22, grade: "junior", gpa: 3.7, major: "Lettres Modernes", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Littérature française", code: "LET301", credits: 4, letterGrade: "A" }] },
    { firstName: "Hugo", lastName: "Bernard", studentId: "SFR2024003", email: "h.bernard@sorbonne.fr", age: 21, grade: "junior", gpa: 3.3, major: "Mathématiques", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Analyse complexe", code: "MAT301", credits: 4, letterGrade: "B+" }] },
    { firstName: "Léa", lastName: "Moreau", studentId: "SFR2024004", email: "l.moreau@sorbonne.fr", age: 19, grade: "freshman", gpa: 3.2, major: "Droit", enrollmentYear: 2024, isActive: true, subjects: [{ name: "Introduction au droit", code: "DRT101", credits: 3, letterGrade: "B+" }] },
    { firstName: "Antoine", lastName: "Simon", studentId: "SFR2024005", email: "a.simon@polytechnique.fr", age: 23, grade: "senior", gpa: 3.9, major: "Génie Informatique", enrollmentYear: 2021, isActive: true, subjects: [{ name: "Intelligence Artificielle", code: "INF401", credits: 4, letterGrade: "A" }] },
    { firstName: "Manon", lastName: "Laurent", studentId: "SFR2024006", email: "m.laurent@sorbonne.fr", age: 24, grade: "graduate", gpa: 3.8, major: "Sciences Politiques", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Relations internationales", code: "SCP501", credits: 3, letterGrade: "A" }] },
    { firstName: "Thomas", lastName: "Lefebvre", studentId: "SFR2024007", email: "t.lefebvre@sorbonne.fr", age: 20, grade: "sophomore", gpa: 3.0, major: "Histoire", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Histoire médiévale", code: "HIS201", credits: 3, letterGrade: "B" }] },
    { firstName: "Chloé", lastName: "Petit", studentId: "SFR2024008", email: "c.petit@sorbonne.fr", age: 22, grade: "junior", gpa: 3.6, major: "Sociologie", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Méthodes qualitatives", code: "SOC301", credits: 3, letterGrade: "A-" }] },
    { firstName: "Mathieu", lastName: "Robert", studentId: "SFR2024009", email: "m.robert@centrale.fr", age: 21, grade: "junior", gpa: 3.4, major: "Physique", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Mécanique quantique", code: "PHY301", credits: 4, letterGrade: "B+" }] },
    { firstName: "Alice", lastName: "Richard", studentId: "SFR2024010", email: "a.richard@sorbonne.fr", age: 26, grade: "phd", gpa: 3.9, major: "Biologie Moléculaire", enrollmentYear: 2021, isActive: true, subjects: [{ name: "Génomique", code: "BIO701", credits: 3, letterGrade: "A" }] },
  ],
  es: [
    { firstName: "Alejandro", lastName: "García", studentId: "SES2024001", email: "a.garcia@uam.es", age: 20, grade: "sophomore", gpa: 3.4, major: "Ingeniería Informática", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Algoritmos", code: "INF201", credits: 6, letterGrade: "A" }] },
    { firstName: "Sofía", lastName: "Martínez", studentId: "SES2024002", email: "s.martinez@uam.es", age: 22, grade: "junior", gpa: 3.7, major: "Medicina", enrollmentYear: 2021, isActive: true, subjects: [{ name: "Anatomía Humana", code: "MED301", credits: 6, letterGrade: "A" }] },
    { firstName: "Carlos", lastName: "López", studentId: "SES2024003", email: "c.lopez@uc3m.es", age: 21, grade: "junior", gpa: 3.2, major: "Derecho", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Derecho Civil", code: "DER301", credits: 6, letterGrade: "B+" }] },
    { firstName: "Lucía", lastName: "Sánchez", studentId: "SES2024004", email: "l.sanchez@uam.es", age: 19, grade: "freshman", gpa: 3.6, major: "Psicología", enrollmentYear: 2024, isActive: true, subjects: [{ name: "Introducción a la Psicología", code: "PSI101", credits: 6, letterGrade: "A" }] },
    { firstName: "Miguel", lastName: "Rodríguez", studentId: "SES2024005", email: "m.rodriguez@upv.es", age: 23, grade: "senior", gpa: 3.5, major: "Arquitectura", enrollmentYear: 2020, isActive: true, subjects: [{ name: "Proyecto Final", code: "ARQ401", credits: 12, letterGrade: "A-" }] },
    { firstName: "Isabella", lastName: "Fernández", studentId: "SES2024006", email: "i.fernandez@uam.es", age: 22, grade: "junior", gpa: 3.8, major: "Economía", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Macroeconomía", code: "ECO301", credits: 6, letterGrade: "A" }] },
    { firstName: "Pablo", lastName: "González", studentId: "SES2024007", email: "p.gonzalez@ucm.es", age: 28, grade: "phd", gpa: 3.9, major: "Historia del Arte", enrollmentYear: 2020, isActive: true, subjects: [{ name: "Arte Contemporáneo", code: "ART701", credits: 4, letterGrade: "A" }] },
    { firstName: "Valentina", lastName: "Díaz", studentId: "SES2024008", email: "v.diaz@uam.es", age: 20, grade: "sophomore", gpa: 3.3, major: "Biología", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Botánica", code: "BIO201", credits: 6, letterGrade: "B+" }] },
    { firstName: "Javier", lastName: "Torres", studentId: "SES2024009", email: "j.torres@uc3m.es", age: 21, grade: "junior", gpa: 3.1, major: "Comunicación", enrollmentYear: 2022, isActive: false, subjects: [{ name: "Periodismo Digital", code: "COM301", credits: 6, letterGrade: "B" }] },
    { firstName: "Carmen", lastName: "Ruiz", studentId: "SES2024010", email: "c.ruiz@uam.es", age: 25, grade: "graduate", gpa: 3.6, major: "Filología Hispánica", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Lingüística Computacional", code: "FIL501", credits: 4, letterGrade: "A-" }] },
  ],
  sr: [
    { firstName: "Nikola", lastName: "Petrović", studentId: "SSR2024001", email: "n.petrovic@bg.ac.rs", age: 21, grade: "junior", gpa: 3.5, major: "Elektrotehnički i računarski", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Diskretna matematika", code: "ETF301", credits: 6, letterGrade: "A" }] },
    { firstName: "Milica", lastName: "Jovanović", studentId: "SSR2024002", email: "m.jovanovic@bg.ac.rs", age: 20, grade: "sophomore", gpa: 3.7, major: "Medicina", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Anatomija", code: "MED201", credits: 6, letterGrade: "A" }] },
    { firstName: "Stefan", lastName: "Nikolić", studentId: "SSR2024003", email: "s.nikolic@matf.bg.ac.rs", age: 22, grade: "junior", gpa: 3.4, major: "Matematika", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Teorija skupova", code: "MAT301", credits: 6, letterGrade: "B+" }] },
    { firstName: "Ana", lastName: "Stojanović", studentId: "SSR2024004", email: "a.stojanovic@bg.ac.rs", age: 19, grade: "freshman", gpa: 3.9, major: "Pravo", enrollmentYear: 2024, isActive: true, subjects: [{ name: "Uvod u pravo", code: "PRA101", credits: 6, letterGrade: "A" }] },
    { firstName: "Aleksandar", lastName: "Đorđević", studentId: "SSR2024005", email: "a.djordjevic@etf.bg.ac.rs", age: 23, grade: "senior", gpa: 3.6, major: "Računarstvo i informatika", enrollmentYear: 2021, isActive: true, subjects: [{ name: "Mašinsko učenje", code: "RI401", credits: 6, letterGrade: "A" }] },
    { firstName: "Jovana", lastName: "Marković", studentId: "SSR2024006", email: "j.markovic@ff.bg.ac.rs", age: 22, grade: "junior", gpa: 3.8, major: "Psihologija", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Socijalna psihologija", code: "PSI301", credits: 6, letterGrade: "A" }] },
    { firstName: "Luka", lastName: "Stanković", studentId: "SSR2024007", email: "l.stankovic@bg.ac.rs", age: 20, grade: "sophomore", gpa: 3.2, major: "Ekonomija", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Mikroekonomija", code: "EKO201", credits: 6, letterGrade: "B+" }] },
    { firstName: "Katarina", lastName: "Ilić", studentId: "SSR2024008", email: "k.ilic@bg.ac.rs", age: 24, grade: "graduate", gpa: 3.7, major: "Arhitektura", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Urbano planiranje", code: "ARH501", credits: 4, letterGrade: "A-" }] },
    { firstName: "Miloš", lastName: "Vasić", studentId: "SSR2024009", email: "m.vasic@bg.ac.rs", age: 27, grade: "phd", gpa: 3.9, major: "Fizika", enrollmentYear: 2020, isActive: true, subjects: [{ name: "Kvantna mehanika", code: "FIZ701", credits: 4, letterGrade: "A" }] },
    { firstName: "Teodora", lastName: "Pavlović", studentId: "SSR2024010", email: "t.pavlovic@bg.ac.rs", age: 21, grade: "junior", gpa: 3.3, major: "Srpski jezik i književnost", enrollmentYear: 2022, isActive: false, subjects: [{ name: "Savremeni srpski jezik", code: "SRB301", credits: 6, letterGrade: "B+" }] },
  ],
  de: [
    { firstName: "Maximilian", lastName: "Müller", studentId: "SDE2024001", email: "m.mueller@tu-berlin.de", age: 21, grade: "junior", gpa: 3.5, major: "Informatik", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Algorithmen und Datenstrukturen", code: "INF301", credits: 6, letterGrade: "A" }] },
    { firstName: "Anna", lastName: "Schmidt", studentId: "SDE2024002", email: "a.schmidt@lmu.de", age: 20, grade: "sophomore", gpa: 3.8, major: "Medizin", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Anatomie", code: "MED201", credits: 8, letterGrade: "A" }] },
    { firstName: "Felix", lastName: "Wagner", studentId: "SDE2024003", email: "f.wagner@kit.edu", age: 22, grade: "junior", gpa: 3.4, major: "Maschinenbau", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Thermodynamik", code: "MB301", credits: 6, letterGrade: "B+" }] },
    { firstName: "Laura", lastName: "Fischer", studentId: "SDE2024004", email: "l.fischer@fu-berlin.de", age: 19, grade: "freshman", gpa: 3.6, major: "Rechtswissenschaften", enrollmentYear: 2024, isActive: true, subjects: [{ name: "Einführung in das Recht", code: "JUR101", credits: 4, letterGrade: "A-" }] },
    { firstName: "Jonas", lastName: "Weber", studentId: "SDE2024005", email: "j.weber@rwth-aachen.de", age: 23, grade: "senior", gpa: 3.7, major: "Elektrotechnik", enrollmentYear: 2021, isActive: true, subjects: [{ name: "Signalverarbeitung", code: "ET401", credits: 6, letterGrade: "A" }] },
    { firstName: "Lena", lastName: "Becker", studentId: "SDE2024006", email: "l.becker@uni-heidelberg.de", age: 25, grade: "graduate", gpa: 3.9, major: "Biowissenschaften", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Genetik", code: "BIO501", credits: 6, letterGrade: "A" }] },
    { firstName: "Lukas", lastName: "Hoffmann", studentId: "SDE2024007", email: "l.hoffmann@lmu.de", age: 21, grade: "junior", gpa: 3.2, major: "Philosophie", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Erkenntnistheorie", code: "PHI301", credits: 4, letterGrade: "B+" }] },
    { firstName: "Sophie", lastName: "Schäfer", studentId: "SDE2024008", email: "s.schaefer@tu-munich.de", age: 22, grade: "junior", gpa: 3.6, major: "Architektur", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Entwerfen III", code: "ARC301", credits: 8, letterGrade: "A" }] },
    { firstName: "Tobias", lastName: "Koch", studentId: "SDE2024009", email: "t.koch@hu-berlin.de", age: 28, grade: "phd", gpa: 3.8, major: "Volkswirtschaftslehre", enrollmentYear: 2020, isActive: true, subjects: [{ name: "Ökonometrie", code: "VWL701", credits: 4, letterGrade: "A" }] },
    { firstName: "Mia", lastName: "Richter", studentId: "SDE2024010", email: "m.richter@uni-koeln.de", age: 20, grade: "sophomore", gpa: 3.3, major: "Psychologie", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Allgemeine Psychologie", code: "PSY201", credits: 6, letterGrade: "B+" }] },
  ],
  mk: [
    { firstName: "Александар", lastName: "Петровски", studentId: "SMK2024001", email: "a.petrovski@ukim.mk", age: 21, grade: "junior", gpa: 3.5, major: "Компјутерски науки", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Алгоритми", code: "КН301", credits: 6, letterGrade: "A" }] },
    { firstName: "Марија", lastName: "Стојановска", studentId: "SMK2024002", email: "m.stojanovska@ukim.mk", age: 20, grade: "sophomore", gpa: 3.8, major: "Медицина", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Анатомија", code: "МЕД201", credits: 8, letterGrade: "A" }] },
    { firstName: "Никола", lastName: "Ристески", studentId: "SMK2024003", email: "n.risteski@ukim.mk", age: 22, grade: "junior", gpa: 3.3, major: "Право", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Граѓанско право", code: "ПРА301", credits: 6, letterGrade: "B+" }] },
    { firstName: "Ана", lastName: "Георгиевска", studentId: "SMK2024004", email: "a.georgievska@ukim.mk", age: 19, grade: "freshman", gpa: 3.9, major: "Психологија", enrollmentYear: 2024, isActive: true, subjects: [{ name: "Вовед во психологија", code: "ПСИ101", credits: 6, letterGrade: "A" }] },
    { firstName: "Стефан", lastName: "Начески", studentId: "SMK2024005", email: "s.naceski@finki.ukim.mk", age: 23, grade: "senior", gpa: 3.7, major: "Софтверско инженерство", enrollmentYear: 2021, isActive: true, subjects: [{ name: "Машинско учење", code: "СИ401", credits: 6, letterGrade: "A" }] },
    { firstName: "Елена", lastName: "Ивановска", studentId: "SMK2024006", email: "e.ivanovska@ukim.mk", age: 22, grade: "junior", gpa: 3.6, major: "Архитектура", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Проектирање", code: "АРХ301", credits: 8, letterGrade: "A-" }] },
    { firstName: "Бојан", lastName: "Димовски", studentId: "SMK2024007", email: "b.dimovski@ukim.mk", age: 20, grade: "sophomore", gpa: 3.1, major: "Економија", enrollmentYear: 2023, isActive: true, subjects: [{ name: "Микроекономија", code: "ЕКО201", credits: 6, letterGrade: "B" }] },
    { firstName: "Катерина", lastName: "Велеска", studentId: "SMK2024008", email: "k.veleska@ukim.mk", age: 25, grade: "graduate", gpa: 3.7, major: "Македонски јазик и литература", enrollmentYear: 2022, isActive: true, subjects: [{ name: "Македонска книжевност", code: "МЈЛ501", credits: 4, letterGrade: "A" }] },
    { firstName: "Димитар", lastName: "Трајковски", studentId: "SMK2024009", email: "d.trajkovski@ukim.mk", age: 27, grade: "phd", gpa: 3.8, major: "Физика", enrollmentYear: 2020, isActive: true, subjects: [{ name: "Квантна механика", code: "ФИЗ701", credits: 4, letterGrade: "A" }] },
    { firstName: "Ивана", lastName: "Јовановска", studentId: "SMK2024010", email: "i.jovanovska@ukim.mk", age: 21, grade: "junior", gpa: 3.4, major: "Биологија", enrollmentYear: 2022, isActive: false, subjects: [{ name: "Генетика", code: "БИО301", credits: 6, letterGrade: "B+" }] },
  ],
}

// ─── RESUMES ─────────────────────────────────────────────────────────────────

const resumes: Record<string, object[]> = {
  en: [
    { firstName: "Ryan", lastName: "Chen", email: "ryan.chen@dev.io", title: "Senior Backend Engineer", seniorityLevel: "senior", yearsOfExperience: 7, skills: ["Node.js", "Python", "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS"], techStack: ["Node.js", "PostgreSQL", "Redis"], programmingLanguages: ["JavaScript", "Python", "Go"], availableForHire: false, location: "London, UK", summary: "Backend engineer specializing in high-throughput distributed systems.", certifications: [{ name: "AWS Solutions Architect", issuer: "Amazon", year: 2022 }], education: [{ degree: "BSc", field: "Computer Science", institution: "University of Bristol", year: 2017 }] },
    { firstName: "Sarah", lastName: "O'Brien", email: "sarah.obrien@dev.io", title: "Lead Frontend Engineer", seniorityLevel: "lead", yearsOfExperience: 9, skills: ["React", "TypeScript", "Next.js", "GraphQL", "CSS", "Webpack", "Jest"], techStack: ["React", "TypeScript", "Next.js"], programmingLanguages: ["TypeScript", "JavaScript"], availableForHire: true, location: "Dublin, Ireland", summary: "Frontend architect with deep React expertise and a passion for UX.", education: [{ degree: "BSc", field: "Software Engineering", institution: "University College Dublin", year: 2015 }] },
    { firstName: "Marcus", lastName: "Wright", email: "marcus.wright@dev.io", title: "DevOps Engineer", seniorityLevel: "mid", yearsOfExperience: 4, skills: ["Kubernetes", "Terraform", "Ansible", "Jenkins", "Prometheus", "Docker", "GCP"], techStack: ["Kubernetes", "Terraform", "GCP"], programmingLanguages: ["Python", "Bash", "Go"], availableForHire: true, location: "Manchester, UK", certifications: [{ name: "CKA", issuer: "CNCF", year: 2023 }, { name: "GCP Professional", issuer: "Google", year: 2022 }], education: [{ degree: "BEng", field: "Computer Networks", institution: "University of Manchester", year: 2020 }] },
    { firstName: "Priya", lastName: "Sharma", email: "priya.sharma@dev.io", title: "Machine Learning Engineer", seniorityLevel: "senior", yearsOfExperience: 6, skills: ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "Spark", "Kafka"], techStack: ["Python", "TensorFlow", "AWS SageMaker"], programmingLanguages: ["Python", "R", "SQL"], availableForHire: false, location: "Edinburgh, UK", certifications: [{ name: "TensorFlow Developer", issuer: "Google", year: 2021 }], education: [{ degree: "MSc", field: "Artificial Intelligence", institution: "University of Edinburgh", year: 2018 }] },
    { firstName: "Tom", lastName: "Harrison", email: "tom.harrison@dev.io", title: "Full Stack Developer", seniorityLevel: "junior", yearsOfExperience: 2, skills: ["React", "Node.js", "MongoDB", "Express", "HTML", "CSS", "Git"], techStack: ["React", "Node.js", "MongoDB"], programmingLanguages: ["JavaScript", "TypeScript"], availableForHire: true, location: "Bristol, UK", education: [{ degree: "BSc", field: "Computing", institution: "University of Bath", year: 2022 }] },
    { firstName: "Zoe", lastName: "Adams", email: "zoe.adams@dev.io", title: "Security Engineer", seniorityLevel: "senior", yearsOfExperience: 8, skills: ["Penetration Testing", "SAST", "DAST", "AWS Security", "OAuth", "Zero Trust"], techStack: ["Burp Suite", "AWS", "Terraform"], programmingLanguages: ["Python", "Bash", "Go"], availableForHire: false, location: "London, UK", certifications: [{ name: "OSCP", issuer: "Offensive Security", year: 2020 }, { name: "CISSP", issuer: "ISC2", year: 2022 }], education: [{ degree: "BSc", field: "Information Security", institution: "Royal Holloway", year: 2016 }] },
    { firstName: "Daniel", lastName: "Park", email: "daniel.park@dev.io", title: "iOS Developer", seniorityLevel: "mid", yearsOfExperience: 5, skills: ["Swift", "SwiftUI", "UIKit", "CoreData", "Combine", "XCTest"], techStack: ["Swift", "SwiftUI", "Xcode"], programmingLanguages: ["Swift", "Objective-C"], availableForHire: false, location: "Cambridge, UK", education: [{ degree: "BSc", field: "Computer Science", institution: "University of Cambridge", year: 2019 }] },
    { firstName: "Emma", lastName: "Thompson", email: "emma.thompson@dev.io", title: "Principal Engineer", seniorityLevel: "principal", yearsOfExperience: 15, skills: ["System Design", "Go", "Rust", "Distributed Systems", "gRPC", "Event Sourcing"], techStack: ["Go", "PostgreSQL", "Kafka"], programmingLanguages: ["Go", "Rust", "Python", "Java"], availableForHire: false, location: "London, UK", certifications: [{ name: "AWS Solutions Architect Professional", issuer: "Amazon", year: 2020 }], education: [{ degree: "MEng", field: "Software Engineering", institution: "Imperial College London", year: 2009 }] },
  ],
  fr: [
    { firstName: "Pierre", lastName: "Lefèvre", email: "p.lefevre@dev.fr", title: "Architecte Logiciel Senior", seniorityLevel: "senior", yearsOfExperience: 8, skills: ["Java", "Spring Boot", "Microservices", "Docker", "Kafka", "PostgreSQL"], techStack: ["Java", "Spring Boot", "Kafka"], programmingLanguages: ["Java", "Python", "TypeScript"], availableForHire: false, location: "Paris, France", certifications: [{ name: "AWS Solutions Architect", issuer: "Amazon", year: 2021 }], education: [{ degree: "Ingénieur", field: "Informatique", institution: "École Polytechnique", year: 2016 }] },
    { firstName: "Isabelle", lastName: "Moreau", email: "i.moreau@dev.fr", title: "Développeuse Full Stack", seniorityLevel: "mid", yearsOfExperience: 5, skills: ["Vue.js", "Node.js", "TypeScript", "MySQL", "Docker", "Git"], techStack: ["Vue.js", "Node.js", "MySQL"], programmingLanguages: ["JavaScript", "TypeScript", "Python"], availableForHire: true, location: "Lyon, France", education: [{ degree: "Master", field: "Génie Logiciel", institution: "Université de Lyon", year: 2019 }] },
    { firstName: "Julien", lastName: "Dubois", email: "j.dubois@dev.fr", title: "Ingénieur DevOps", seniorityLevel: "senior", yearsOfExperience: 7, skills: ["Kubernetes", "Terraform", "GitLab CI", "Prometheus", "Elasticsearch"], techStack: ["Kubernetes", "Terraform", "Azure"], programmingLanguages: ["Python", "Bash", "Go"], availableForHire: false, location: "Bordeaux, France", certifications: [{ name: "CKA", issuer: "CNCF", year: 2022 }], education: [{ degree: "Ingénieur", field: "Réseaux et Télécoms", institution: "ENSIMAG", year: 2017 }] },
    { firstName: "Marie", lastName: "Fontaine", email: "m.fontaine@dev.fr", title: "Data Scientist", seniorityLevel: "mid", yearsOfExperience: 4, skills: ["Python", "Pandas", "Scikit-learn", "TensorFlow", "SQL", "Spark"], techStack: ["Python", "TensorFlow", "Azure ML"], programmingLanguages: ["Python", "R", "SQL"], availableForHire: true, location: "Toulouse, France", education: [{ degree: "Master", field: "Intelligence Artificielle", institution: "Université Paul Sabatier", year: 2020 }] },
    { firstName: "Antoine", lastName: "Girard", email: "a.girard@dev.fr", title: "Développeur Mobile", seniorityLevel: "junior", yearsOfExperience: 2, skills: ["React Native", "TypeScript", "iOS", "Android", "REST APIs"], techStack: ["React Native", "TypeScript"], programmingLanguages: ["TypeScript", "JavaScript"], availableForHire: true, location: "Nantes, France", education: [{ degree: "Licence", field: "Informatique", institution: "Université de Nantes", year: 2022 }] },
    { firstName: "Sophie", lastName: "Blanc", email: "s.blanc@dev.fr", title: "Ingénieure Sécurité", seniorityLevel: "senior", yearsOfExperience: 9, skills: ["Pentest", "SIEM", "SOC", "Cryptographie", "OAuth 2.0", "Zero Trust"], techStack: ["Splunk", "AWS Security", "Burp Suite"], programmingLanguages: ["Python", "Bash"], availableForHire: false, location: "Paris, France", certifications: [{ name: "OSCP", issuer: "Offensive Security", year: 2019 }, { name: "CEH", issuer: "EC-Council", year: 2020 }], education: [{ degree: "Ingénieur", field: "Sécurité des Systèmes", institution: "EPITA", year: 2015 }] },
    { firstName: "Clément", lastName: "Rousseau", email: "c.rousseau@dev.fr", title: "Lead Backend Go", seniorityLevel: "lead", yearsOfExperience: 11, skills: ["Go", "gRPC", "PostgreSQL", "Redis", "Kubernetes", "Event Sourcing", "CQRS"], techStack: ["Go", "PostgreSQL", "Kubernetes"], programmingLanguages: ["Go", "Python", "Rust"], availableForHire: false, location: "Paris, France", education: [{ degree: "Ingénieur", field: "Informatique", institution: "CentraleSupélec", year: 2013 }] },
    { firstName: "Lucie", lastName: "Bonnet", email: "l.bonnet@dev.fr", title: "UX Engineer", seniorityLevel: "mid", yearsOfExperience: 5, skills: ["React", "CSS", "Figma", "Accessibility", "TypeScript", "Storybook"], techStack: ["React", "TypeScript", "Storybook"], programmingLanguages: ["TypeScript", "JavaScript"], availableForHire: true, location: "Strasbourg, France", education: [{ degree: "Master", field: "Interaction Design", institution: "ENSAD", year: 2019 }] },
  ],
  es: [
    { firstName: "Carlos", lastName: "García Martín", email: "c.garcia@dev.es", title: "Arquitecto de Soluciones", seniorityLevel: "principal", yearsOfExperience: 14, skills: ["AWS", "Azure", "Kubernetes", "Terraform", "Java", "Python", "System Design"], techStack: ["AWS", "Kubernetes", "Java"], programmingLanguages: ["Java", "Python", "Go"], availableForHire: false, location: "Madrid, España", certifications: [{ name: "AWS Solutions Architect Professional", issuer: "Amazon", year: 2020 }, { name: "CKA", issuer: "CNCF", year: 2021 }], education: [{ degree: "Ingeniería Informática", field: "Informática", institution: "UPM Madrid", year: 2010 }] },
    { firstName: "Elena", lastName: "Rodríguez López", email: "e.rodriguez@dev.es", title: "Desarrolladora Frontend Senior", seniorityLevel: "senior", yearsOfExperience: 7, skills: ["React", "TypeScript", "GraphQL", "Next.js", "Testing Library", "Webpack"], techStack: ["React", "TypeScript", "GraphQL"], programmingLanguages: ["TypeScript", "JavaScript"], availableForHire: false, location: "Barcelona, España", education: [{ degree: "Grado", field: "Ingeniería del Software", institution: "UPC Barcelona", year: 2017 }] },
    { firstName: "Diego", lastName: "Fernández Castro", email: "d.fernandez@dev.es", title: "Ingeniero de Datos", seniorityLevel: "senior", yearsOfExperience: 6, skills: ["Python", "Apache Spark", "Kafka", "dbt", "Snowflake", "Airflow", "SQL"], techStack: ["Python", "Spark", "Snowflake"], programmingLanguages: ["Python", "SQL", "Scala"], availableForHire: true, location: "Valencia, España", certifications: [{ name: "Google Professional Data Engineer", issuer: "Google", year: 2022 }], education: [{ degree: "Máster", field: "Ciencia de Datos", institution: "Universidad Politécnica de Valencia", year: 2018 }] },
    { firstName: "Laura", lastName: "Sánchez Vega", email: "l.sanchez@dev.es", title: "Desarrolladora iOS", seniorityLevel: "mid", yearsOfExperience: 4, skills: ["Swift", "SwiftUI", "CoreML", "ARKit", "XCTest", "Fastlane"], techStack: ["Swift", "SwiftUI"], programmingLanguages: ["Swift", "Objective-C"], availableForHire: true, location: "Sevilla, España", education: [{ degree: "Grado", field: "Multimedia", institution: "Universidad de Sevilla", year: 2020 }] },
    { firstName: "Javier", lastName: "Torres Ruiz", email: "j.torres@dev.es", title: "DevOps Engineer", seniorityLevel: "mid", yearsOfExperience: 5, skills: ["Docker", "Kubernetes", "Jenkins", "Prometheus", "Grafana", "Terraform", "Azure"], techStack: ["Kubernetes", "Terraform", "Azure"], programmingLanguages: ["Python", "Bash"], availableForHire: false, location: "Bilbao, España", certifications: [{ name: "AZ-900", issuer: "Microsoft", year: 2022 }], education: [{ degree: "Grado", field: "Ingeniería Telemática", institution: "UPV/EHU", year: 2019 }] },
    { firstName: "Ana", lastName: "López Martínez", email: "a.lopez@dev.es", title: "Full Stack Developer", seniorityLevel: "junior", yearsOfExperience: 2, skills: ["Vue.js", "Node.js", "MongoDB", "Docker", "REST", "Git"], techStack: ["Vue.js", "Node.js", "MongoDB"], programmingLanguages: ["JavaScript", "TypeScript"], availableForHire: true, location: "Granada, España", education: [{ degree: "Grado", field: "Ingeniería Informática", institution: "Universidad de Granada", year: 2022 }] },
    { firstName: "Pablo", lastName: "González Rivera", email: "p.gonzalez@dev.es", title: "CTO", seniorityLevel: "cto", yearsOfExperience: 18, skills: ["System Architecture", "Team Leadership", "Go", "Rust", "Cloud Strategy", "Agile"], techStack: ["Go", "AWS", "PostgreSQL"], programmingLanguages: ["Go", "Rust", "Python", "JavaScript"], availableForHire: false, location: "Madrid, España", education: [{ degree: "Doctorado", field: "Ciencias de la Computación", institution: "UAM Madrid", year: 2006 }] },
    { firstName: "Sofía", lastName: "Morales Delgado", email: "s.morales@dev.es", title: "QA Automation Engineer", seniorityLevel: "senior", yearsOfExperience: 8, skills: ["Selenium", "Cypress", "Jest", "Pytest", "Postman", "JMeter", "BDD"], techStack: ["Cypress", "Selenium", "Pytest"], programmingLanguages: ["Python", "TypeScript", "Java"], availableForHire: true, location: "Zaragoza, España", certifications: [{ name: "ISTQB Advanced", issuer: "ISTQB", year: 2020 }], education: [{ degree: "Grado", field: "Informática", institution: "Universidad de Zaragoza", year: 2016 }] },
  ],
  sr: [
    { firstName: "Nikola", lastName: "Jovanović", email: "n.jovanovic@dev.rs", title: "Senior Backend Engineer", seniorityLevel: "senior", yearsOfExperience: 7, skills: ["Java", "Spring Boot", "Kafka", "PostgreSQL", "Redis", "Docker"], techStack: ["Java", "Spring Boot", "PostgreSQL"], programmingLanguages: ["Java", "Python", "TypeScript"], availableForHire: false, location: "Belgrade, Serbia", certifications: [{ name: "Oracle Java SE Programmer", issuer: "Oracle", year: 2021 }], education: [{ degree: "MSc", field: "Computer Science", institution: "University of Belgrade", year: 2017 }] },
    { firstName: "Milica", lastName: "Petrović", email: "m.petrovic@dev.rs", title: "Frontend Developer", seniorityLevel: "mid", yearsOfExperience: 4, skills: ["React", "TypeScript", "Next.js", "TailwindCSS", "Figma", "REST APIs"], techStack: ["React", "TypeScript", "Next.js"], programmingLanguages: ["TypeScript", "JavaScript"], availableForHire: true, location: "Novi Sad, Serbia", education: [{ degree: "BSc", field: "Software Engineering", institution: "University of Novi Sad", year: 2020 }] },
    { firstName: "Stefan", lastName: "Đorđević", email: "s.djordjevic@dev.rs", title: "DevOps Engineer", seniorityLevel: "mid", yearsOfExperience: 5, skills: ["Kubernetes", "Terraform", "AWS", "Jenkins", "Prometheus", "Grafana"], techStack: ["Kubernetes", "AWS", "Terraform"], programmingLanguages: ["Python", "Bash", "Go"], availableForHire: false, location: "Belgrade, Serbia", certifications: [{ name: "AWS Developer Associate", issuer: "Amazon", year: 2022 }], education: [{ degree: "BSc", field: "Computer Engineering", institution: "ETF Belgrade", year: 2019 }] },
    { firstName: "Ana", lastName: "Marković", email: "a.markovic@dev.rs", title: "Data Engineer", seniorityLevel: "senior", yearsOfExperience: 6, skills: ["Python", "Spark", "Airflow", "dbt", "Snowflake", "Kafka", "SQL"], techStack: ["Python", "Airflow", "Snowflake"], programmingLanguages: ["Python", "SQL", "Scala"], availableForHire: true, location: "Subotica, Serbia", education: [{ degree: "MSc", field: "Data Science", institution: "University of Belgrade", year: 2018 }] },
    { firstName: "Vladimir", lastName: "Nikolić", email: "v.nikolic@dev.rs", title: "iOS Developer", seniorityLevel: "junior", yearsOfExperience: 2, skills: ["Swift", "SwiftUI", "UIKit", "CoreData", "REST APIs"], techStack: ["Swift", "SwiftUI"], programmingLanguages: ["Swift", "Objective-C"], availableForHire: true, location: "Belgrade, Serbia", education: [{ degree: "BSc", field: "Computer Science", institution: "Singidunum University", year: 2022 }] },
    { firstName: "Jelena", lastName: "Stanković", email: "j.stankovic@dev.rs", title: "QA Lead", seniorityLevel: "lead", yearsOfExperience: 9, skills: ["Selenium", "Cypress", "API Testing", "Postman", "JIRA", "Agile", "BDD"], techStack: ["Cypress", "Postman", "Selenium"], programmingLanguages: ["Python", "JavaScript"], availableForHire: false, location: "Niš, Serbia", certifications: [{ name: "ISTQB Foundation", issuer: "ISTQB", year: 2018 }], education: [{ degree: "BSc", field: "Informatics", institution: "University of Niš", year: 2015 }] },
    { firstName: "Marko", lastName: "Vasiljević", email: "m.vasiljevic@dev.rs", title: "Machine Learning Engineer", seniorityLevel: "senior", yearsOfExperience: 6, skills: ["Python", "PyTorch", "TensorFlow", "Hugging Face", "MLflow", "FastAPI"], techStack: ["Python", "PyTorch", "AWS SageMaker"], programmingLanguages: ["Python", "Julia"], availableForHire: false, location: "Belgrade, Serbia", education: [{ degree: "MSc", field: "Artificial Intelligence", institution: "Mathematical Faculty Belgrade", year: 2018 }] },
    { firstName: "Teodora", lastName: "Lazić", email: "t.lazic@dev.rs", title: "Full Stack Developer", seniorityLevel: "mid", yearsOfExperience: 4, skills: ["React", "Node.js", "PostgreSQL", "Docker", "TypeScript", "GraphQL"], techStack: ["React", "Node.js", "PostgreSQL"], programmingLanguages: ["TypeScript", "JavaScript", "Python"], availableForHire: true, location: "Belgrade, Serbia", education: [{ degree: "BSc", field: "Software Engineering", institution: "Faculty of Organizational Sciences", year: 2020 }] },
  ],
  de: [
    { firstName: "Florian", lastName: "Müller", email: "f.mueller@dev.de", title: "Senior Backend Entwickler", seniorityLevel: "senior", yearsOfExperience: 8, skills: ["Java", "Spring Boot", "PostgreSQL", "Kafka", "Docker", "Kubernetes"], techStack: ["Java", "Spring Boot", "Kafka"], programmingLanguages: ["Java", "Python", "Go"], availableForHire: false, location: "Berlin, Deutschland", certifications: [{ name: "AWS Solutions Architect", issuer: "Amazon", year: 2021 }], education: [{ degree: "Diplom-Informatiker", field: "Informatik", institution: "TU Berlin", year: 2016 }] },
    { firstName: "Katharina", lastName: "Schmidt", email: "k.schmidt@dev.de", title: "Frontend Entwicklerin", seniorityLevel: "mid", yearsOfExperience: 5, skills: ["React", "TypeScript", "Vue.js", "Webpack", "CSS Modules", "Jest"], techStack: ["React", "TypeScript"], programmingLanguages: ["TypeScript", "JavaScript"], availableForHire: true, location: "München, Deutschland", education: [{ degree: "Bachelor", field: "Medieninformatik", institution: "TU München", year: 2019 }] },
    { firstName: "Alexander", lastName: "Weber", email: "a.weber@dev.de", title: "DevOps Ingenieur", seniorityLevel: "senior", yearsOfExperience: 9, skills: ["Kubernetes", "Terraform", "CI/CD", "Prometheus", "Grafana", "GCP", "Helm"], techStack: ["Kubernetes", "Terraform", "GCP"], programmingLanguages: ["Go", "Python", "Bash"], availableForHire: false, location: "Hamburg, Deutschland", certifications: [{ name: "CKA", issuer: "CNCF", year: 2021 }, { name: "GCP Professional DevOps", issuer: "Google", year: 2022 }], education: [{ degree: "Master", field: "Informatik", institution: "RWTH Aachen", year: 2015 }] },
    { firstName: "Julia", lastName: "Fischer", email: "j.fischer@dev.de", title: "Data Scientist", seniorityLevel: "senior", yearsOfExperience: 7, skills: ["Python", "R", "TensorFlow", "Scikit-learn", "SQL", "Tableau", "Spark"], techStack: ["Python", "TensorFlow", "Azure ML"], programmingLanguages: ["Python", "R", "SQL"], availableForHire: true, location: "Frankfurt, Deutschland", certifications: [{ name: "Google Professional ML Engineer", issuer: "Google", year: 2022 }], education: [{ degree: "Master", field: "Statistik und Data Science", institution: "LMU München", year: 2017 }] },
    { firstName: "Lukas", lastName: "Wagner", email: "l.wagner@dev.de", title: "Mobile Developer", seniorityLevel: "junior", yearsOfExperience: 2, skills: ["Flutter", "Dart", "Android", "iOS", "Firebase", "REST APIs"], techStack: ["Flutter", "Firebase"], programmingLanguages: ["Dart", "Kotlin", "Swift"], availableForHire: true, location: "Cologne, Deutschland", education: [{ degree: "Bachelor", field: "Informatik", institution: "Universität zu Köln", year: 2022 }] },
    { firstName: "Anna", lastName: "Hoffmann", email: "a.hoffmann@dev.de", title: "IT Security Analyst", seniorityLevel: "senior", yearsOfExperience: 8, skills: ["Penetration Testing", "SIEM", "Incident Response", "IAM", "Compliance", "OSINT"], techStack: ["Splunk", "Burp Suite", "Metasploit"], programmingLanguages: ["Python", "Bash"], availableForHire: false, location: "Stuttgart, Deutschland", certifications: [{ name: "CISSP", issuer: "ISC2", year: 2021 }, { name: "CEH", issuer: "EC-Council", year: 2019 }], education: [{ degree: "Master", field: "IT-Sicherheit", institution: "Uni Bochum", year: 2016 }] },
    { firstName: "Tim", lastName: "Becker", email: "t.becker@dev.de", title: "Rust Entwickler", seniorityLevel: "mid", yearsOfExperience: 4, skills: ["Rust", "WebAssembly", "C++", "Embedded Systems", "Linux", "gRPC"], techStack: ["Rust", "WebAssembly"], programmingLanguages: ["Rust", "C++", "Python"], availableForHire: false, location: "Nuremberg, Deutschland", education: [{ degree: "Bachelor", field: "Elektro- und Informationstechnik", institution: "FAU Erlangen-Nürnberg", year: 2020 }] },
    { firstName: "Sophia", lastName: "Klein", email: "s.klein@dev.de", title: "Cloud Architektin", seniorityLevel: "lead", yearsOfExperience: 11, skills: ["AWS", "Azure", "GCP", "Terraform", "System Design", "Cost Optimization"], techStack: ["AWS", "Terraform", "Kubernetes"], programmingLanguages: ["Python", "Go", "TypeScript"], availableForHire: false, location: "Düsseldorf, Deutschland", certifications: [{ name: "AWS Solutions Architect Professional", issuer: "Amazon", year: 2020 }, { name: "Azure Solutions Architect Expert", issuer: "Microsoft", year: 2021 }], education: [{ degree: "Diplom-Informatikerin", field: "Informatik", institution: "KIT Karlsruhe", year: 2013 }] },
  ],
  mk: [
    { firstName: "Александар", lastName: "Димитровски", email: "a.dimitrovski@dev.mk", title: "Senior Backend Developer", seniorityLevel: "senior", yearsOfExperience: 7, skills: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "AWS"], techStack: ["Python", "FastAPI", "PostgreSQL"], programmingLanguages: ["Python", "JavaScript", "Go"], availableForHire: false, location: "Skopje, Macedonia", education: [{ degree: "BSc", field: "Computer Science", institution: "UKIM Skopje", year: 2017 }] },
    { firstName: "Марија", lastName: "Костовска", email: "m.kostovska@dev.mk", title: "Frontend Developer", seniorityLevel: "mid", yearsOfExperience: 4, skills: ["React", "TypeScript", "Next.js", "TailwindCSS", "REST APIs", "Git"], techStack: ["React", "TypeScript", "Next.js"], programmingLanguages: ["TypeScript", "JavaScript"], availableForHire: true, location: "Bitola, Macedonia", education: [{ degree: "BSc", field: "Software Engineering", institution: "St. Kliment Ohridski University", year: 2020 }] },
    { firstName: "Стефан", lastName: "Трпевски", email: "s.trpevski@dev.mk", title: "DevOps Engineer", seniorityLevel: "mid", yearsOfExperience: 5, skills: ["Docker", "Kubernetes", "Terraform", "AWS", "CI/CD", "Bash"], techStack: ["Kubernetes", "AWS", "Terraform"], programmingLanguages: ["Python", "Bash", "Go"], availableForHire: true, location: "Skopje, Macedonia", certifications: [{ name: "AWS Cloud Practitioner", issuer: "Amazon", year: 2022 }], education: [{ degree: "BSc", field: "Computer Networks", institution: "FINKI Skopje", year: 2019 }] },
    { firstName: "Ана", lastName: "Ристоска", email: "a.ristoska@dev.mk", title: "Data Analyst", seniorityLevel: "junior", yearsOfExperience: 2, skills: ["Python", "SQL", "Tableau", "Pandas", "Excel", "Power BI"], techStack: ["Python", "SQL", "Tableau"], programmingLanguages: ["Python", "SQL"], availableForHire: true, location: "Ohrid, Macedonia", education: [{ degree: "BSc", field: "Statistics", institution: "UKIM Skopje", year: 2022 }] },
    { firstName: "Димитар", lastName: "Наумоски", email: "d.naumoski@dev.mk", title: "Full Stack Developer", seniorityLevel: "senior", yearsOfExperience: 8, skills: ["Node.js", "React", "PostgreSQL", "MongoDB", "Docker", "GraphQL", "TypeScript"], techStack: ["Node.js", "React", "PostgreSQL"], programmingLanguages: ["TypeScript", "JavaScript", "Python"], availableForHire: false, location: "Skopje, Macedonia", education: [{ degree: "MSc", field: "Software Engineering", institution: "UKIM Skopje", year: 2016 }] },
    { firstName: "Елена", lastName: "Цветковска", email: "e.cvetkovska@dev.mk", title: "QA Engineer", seniorityLevel: "mid", yearsOfExperience: 4, skills: ["Selenium", "Cypress", "Postman", "JIRA", "Agile", "API Testing"], techStack: ["Cypress", "Selenium", "Postman"], programmingLanguages: ["JavaScript", "Python"], availableForHire: true, location: "Skopje, Macedonia", certifications: [{ name: "ISTQB Foundation", issuer: "ISTQB", year: 2021 }], education: [{ degree: "BSc", field: "Computer Science", institution: "FINKI Skopje", year: 2020 }] },
    { firstName: "Бојан", lastName: "Јовановски", email: "b.jovanovski@dev.mk", title: "Android Developer", seniorityLevel: "mid", yearsOfExperience: 5, skills: ["Kotlin", "Jetpack Compose", "Android SDK", "Room", "Coroutines", "MVVM"], techStack: ["Kotlin", "Jetpack Compose"], programmingLanguages: ["Kotlin", "Java"], availableForHire: false, location: "Tetovo, Macedonia", education: [{ degree: "BSc", field: "Informatics", institution: "South East European University", year: 2019 }] },
    { firstName: "Ивана", lastName: "Михајловска", email: "i.mihajlovska@dev.mk", title: "Machine Learning Engineer", seniorityLevel: "senior", yearsOfExperience: 6, skills: ["Python", "PyTorch", "NLP", "Hugging Face", "MLflow", "FastAPI"], techStack: ["Python", "PyTorch"], programmingLanguages: ["Python", "Julia"], availableForHire: true, location: "Skopje, Macedonia", education: [{ degree: "MSc", field: "Artificial Intelligence", institution: "UKIM Skopje", year: 2018 }] },
  ],
}

// ─── ANIMALS ─────────────────────────────────────────────────────────────────
// locale: false — seeded once under EN admin, shared across all locales.

const animals: object[] = [
  { name: "African Elephant", scientificName: "Loxodonta africana", type: "mammal", habitat: "savanna", diet: "herbivore", conservationStatus: "VU", weightKg: 5400, lifespanYears: 65, isNocturnal: false, nativeRegion: "Sub-Saharan Africa", funFact: "Elephants can recognize themselves in mirrors and mourn their dead.", speed: 40, tags: ["megafauna", "intelligent"] },
  { name: "Snow Leopard", scientificName: "Panthera uncia", type: "mammal", habitat: "mountain", diet: "carnivore", conservationStatus: "VU", weightKg: 45, lifespanYears: 16, isNocturnal: true, nativeRegion: "Central Asia", funFact: "Snow leopards cannot roar — they make a unique chuffing sound called 'prusten'.", speed: 64, tags: ["big cat", "endangered"] },
  { name: "Blue Whale", scientificName: "Balaenoptera musculus", type: "mammal", habitat: "ocean", diet: "carnivore", conservationStatus: "EN", weightKg: 150000, lifespanYears: 90, isNocturnal: false, nativeRegion: "All Oceans", funFact: "A blue whale's heart is the size of a small car and can be heard from 3 km away.", speed: 46, tags: ["largest animal", "marine"] },
  { name: "Axolotl", scientificName: "Ambystoma mexicanum", type: "amphibian", habitat: "freshwater", diet: "carnivore", conservationStatus: "CR", weightKg: 0.3, lifespanYears: 15, isNocturnal: false, nativeRegion: "Lake Xochimilco, Mexico", funFact: "Axolotls can regenerate entire limbs, hearts, and parts of their brain.", tags: ["neotenic", "regeneration"] },
  { name: "Mantis Shrimp", scientificName: "Stomatopoda", type: "cephalopod", habitat: "ocean", diet: "carnivore", conservationStatus: "LC", weightKg: 0.1, lifespanYears: 20, isNocturnal: false, nativeRegion: "Indo-Pacific Oceans", funFact: "Mantis shrimp can see 16 types of color receptors (humans have only 3) and punch with the force of a bullet.", speed: 23, tags: ["colorful", "powerful"] },
  { name: "Tardigrade", scientificName: "Tardigrada", type: "insect", habitat: "urban", diet: "herbivore", conservationStatus: "LC", weightKg: 0.000001, lifespanYears: 2, isNocturnal: false, nativeRegion: "Worldwide", funFact: "Tardigrades can survive in space, boiling water, and near-absolute-zero temperatures.", tags: ["extremophile", "microscopic"] },
  { name: "Peregrine Falcon", scientificName: "Falco peregrinus", type: "bird", habitat: "mountain", diet: "carnivore", conservationStatus: "LC", weightKg: 1.1, lifespanYears: 17, isNocturnal: false, nativeRegion: "Worldwide except Antarctica", funFact: "The peregrine falcon is the fastest animal on Earth, diving at over 390 km/h.", speed: 390, tags: ["fastest", "raptor"] },
  { name: "Komodo Dragon", scientificName: "Varanus komodoensis", type: "reptile", habitat: "forest", diet: "carnivore", conservationStatus: "EN", weightKg: 70, lifespanYears: 30, isNocturnal: false, nativeRegion: "Komodo Island, Indonesia", funFact: "Komodo dragons have venomous saliva and can reproduce via parthenogenesis.", speed: 20, tags: ["monitor lizard", "venomous"] },
  { name: "Monarch Butterfly", scientificName: "Danaus plexippus", type: "insect", habitat: "grassland", diet: "herbivore", conservationStatus: "EN", weightKg: 0.0005, lifespanYears: 1, isNocturnal: false, nativeRegion: "North America", funFact: "Monarch butterflies migrate up to 4,500 km from Canada to Mexico each year.", tags: ["migration", "pollinator"] },
  { name: "Bowhead Whale", scientificName: "Balaena mysticetus", type: "mammal", habitat: "arctic", diet: "carnivore", conservationStatus: "LC", weightKg: 100000, lifespanYears: 200, isNocturnal: false, nativeRegion: "Arctic Ocean", funFact: "Bowhead whales can live over 200 years — the oldest known vertebrate animal.", speed: 18, tags: ["longevity", "arctic"] },
  { name: "Mimic Octopus", scientificName: "Thaumoctopus mimicus", type: "cephalopod", habitat: "ocean", diet: "carnivore", conservationStatus: "LC", weightKg: 0.5, lifespanYears: 2, isNocturnal: false, nativeRegion: "Indo-Pacific", funFact: "The mimic octopus can impersonate over 15 different species including lionfish, flatfish, and sea snakes.", tags: ["camouflage", "intelligent"] },
  { name: "Cheetah", scientificName: "Acinonyx jubatus", type: "mammal", habitat: "savanna", diet: "carnivore", conservationStatus: "VU", weightKg: 54, lifespanYears: 12, isNocturnal: false, nativeRegion: "Africa and Iran", funFact: "Cheetahs are the fastest land animal and can accelerate from 0 to 100 km/h in just 3 seconds.", speed: 120, tags: ["fastest land animal", "big cat"] },
  { name: "Leafcutter Ant", scientificName: "Atta cephalotes", type: "insect", habitat: "forest", diet: "herbivore", conservationStatus: "LC", weightKg: 0.000003, lifespanYears: 0.2, isNocturnal: false, nativeRegion: "Central and South America", funFact: "Leafcutter ants can carry 50 times their own body weight and farm fungi underground.", tags: ["superorganism", "farming"] },
  { name: "Platypus", scientificName: "Ornithorhynchus anatinus", type: "mammal", habitat: "freshwater", diet: "carnivore", conservationStatus: "NT", weightKg: 1.7, lifespanYears: 17, isNocturnal: true, nativeRegion: "Eastern Australia and Tasmania", funFact: "The platypus is one of only five mammals that lay eggs, and the males have venomous ankle spurs.", tags: ["monotreme", "venomous"] },
  { name: "Harpy Eagle", scientificName: "Harpia harpyja", type: "bird", habitat: "forest", diet: "carnivore", conservationStatus: "VU", weightKg: 9, lifespanYears: 35, isNocturnal: false, nativeRegion: "Central and South America", funFact: "The harpy eagle has talons larger than a grizzly bear's claws and can carry prey equal to its own weight.", speed: 80, tags: ["apex predator", "raptor"] },
  { name: "Arctic Fox", scientificName: "Vulpes lagopus", type: "mammal", habitat: "arctic", diet: "omnivore", conservationStatus: "LC", weightKg: 3.5, lifespanYears: 6, isNocturnal: false, nativeRegion: "Arctic Tundra", funFact: "Arctic foxes can withstand temperatures as low as −70°C and change fur color with the seasons.", speed: 50, tags: ["adaptive", "camouflage"] },
  { name: "Pistol Shrimp", scientificName: "Alpheidae", type: "cephalopod", habitat: "ocean", diet: "carnivore", conservationStatus: "LC", weightKg: 0.005, lifespanYears: 4, isNocturnal: false, nativeRegion: "Tropical Oceans", funFact: "Pistol shrimp create a cavitation bubble that reaches 4,400°C — hotter than the sun's surface — to stun prey.", tags: ["extreme", "ocean"] },
  { name: "Vampire Bat", scientificName: "Desmodus rotundus", type: "mammal", habitat: "forest", diet: "carnivore", conservationStatus: "LC", weightKg: 0.04, lifespanYears: 12, isNocturnal: true, nativeRegion: "Latin America", funFact: "Vampire bats are one of the few animals that practice food sharing — they regurgitate blood for starving roost-mates.", tags: ["hematophage", "social"] },
  { name: "Wandering Albatross", scientificName: "Diomedea exulans", type: "bird", habitat: "ocean", diet: "carnivore", conservationStatus: "VU", weightKg: 11, lifespanYears: 60, isNocturnal: false, nativeRegion: "Southern Ocean", funFact: "The wandering albatross has the largest wingspan of any living bird at up to 3.5 meters, and can glide for hours without flapping.", speed: 126, tags: ["largest wingspan", "seabird"] },
  { name: "Giant Pacific Octopus", scientificName: "Enteroctopus dofleini", type: "cephalopod", habitat: "ocean", diet: "carnivore", conservationStatus: "LC", weightKg: 15, lifespanYears: 5, isNocturnal: true, nativeRegion: "North Pacific Ocean", funFact: "Giant Pacific octopuses have three hearts, blue blood, and can change texture and color in 200 milliseconds.", tags: ["intelligent", "cephalopod"] },
]

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting table seeding...\n")

  const missing = Object.entries(localeAdmins)
    .filter(([, id]) => !id)
    .map(([locale]) => locale)

  if (missing.length > 0) {
    console.warn(`⚠  No admin ID found for locales: ${missing.join(", ")} — these will be skipped.\n`)
  }

  // ── Quotes ────────────────────────────────────────────────────────────────
  console.log("📝 Seeding quotes...")
  for (const [locale, adminId] of Object.entries(localeAdmins)) {
    if (!adminId) continue
    await seedTable("quotes", locale, adminId, quotes[locale] ?? [])
  }

  // ── Books ─────────────────────────────────────────────────────────────────
  console.log("\n📚 Seeding books...")
  for (const [locale, adminId] of Object.entries(localeAdmins)) {
    if (!adminId) continue
    await seedTable("books", locale, adminId, books[locale] ?? [])
  }

  // ── Students ──────────────────────────────────────────────────────────────
  console.log("\n🎓 Seeding students...")
  for (const [locale, adminId] of Object.entries(localeAdmins)) {
    if (!adminId) continue
    await seedTable("students", locale, adminId, students[locale] ?? [])
  }

  // ── Resumes ───────────────────────────────────────────────────────────────
  console.log("\n💼 Seeding resumes...")
  for (const [locale, adminId] of Object.entries(localeAdmins)) {
    if (!adminId) continue
    await seedTable("resumes", locale, adminId, resumes[locale] ?? [])
  }

  // ── Animals (locale: false — seeded once under EN admin) ─────────────────
  console.log("\n🦁 Seeding animals...")
  const enAdmin = localeAdmins.en
  if (enAdmin) {
    await seedTable("animals", "en", enAdmin, animals)
  } else {
    console.warn("  ⚠  Skipping animals — LOCALE_ADMIN_EN not set")
  }

  console.log("\n✅ Seeding complete.")
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
