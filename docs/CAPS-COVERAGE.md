# Bonisa: CAPS alignment and coverage

Last checked: 12 November 2026. Bonisa teaches mathematics and the sciences, so this covers Mathematics (Grades 4–12), Natural Sciences (Grades 4–9, called Natural Sciences and Technology in Grades 4–6), Physical Sciences and Life Sciences (Grades 10–12). Languages, Life Skills and the other CAPS subjects from Grade 4 are out of scope on purpose. Grades 1–3 are in §8 of `ARCHITECTURE.md`.

Labels used below: **FACT** (checked against a source named here), **INFERENCE** (my reading, not yet checked line by line), **GAP** (CAPS topic with no Bonisa skill yet).

## 1. Subjects now follow CAPS (FACT)

| Grades | CAPS phase | Bonisa subjects | Bonisa experience |
|---|---|---|---|
| 1–3 | Foundation | Mathematics, Home Language, English FAL, Life Skills | Bonisa Junior |
| 4–6 | Intermediate | Mathematics, Natural Sciences and Technology | Bonisa |
| 7–9 | Senior | Mathematics, Natural Sciences | Bonisa |
| 10–12 | FET | Mathematics, Physical Sciences, Life Sciences | Bonisa Matric |

- Natural Sciences is **one subject** for Grades 4–9, organised by the four CAPS knowledge strands: Life and Living, Matter and Materials, Energy and Change, Planet Earth and Beyond (plus Technology: Structures, which CAPS integrates in Grades 4–6). Source: CAPS Natural Sciences Grades 7–9 (DBE, 2011); the NS&T Intermediate Phase CAPS uses the same four strands.
- Physical Sciences and Life Sciences start in **Grade 10**. Grade 4–9 learners can no longer choose them; their earlier Grade 7–9 physics, chemistry and biology skills now live in Natural Sciences under the right strand. Migration v7 moved existing learners and classes. Mastery is per skill, so nothing was lost.
- The band follows the CAPS path: a Grade 9 Natural Sciences learner sees Grade 10 Physical and Life Sciences as "Coming up in Grade 10"; a Grade 10 Physical Sciences learner can catch up on Grade 6–9 Matter and Materials and Energy and Change.
- Every skill now has `grade` equal to its CAPS grade, and a prerequisite is never taught later than the skill that needs it. Both are enforced by `phases.test.ts`.

## 2. Grade placements corrected in this pass (FACT)

| Skill | Was | Now | Why |
|---|---|---|---|
| Decimals | Grade 5 | Grade 6 | CAPS introduces decimal fractions (to 2 places) in Grade 6. |
| Arithmetic and geometric sequences | Grade 10 | Grade 12 | Geometric sequences and series are Grade 12 "Number patterns, sequences and series". Grade 10 has linear patterns only. |
| States of matter and the particle model | Grade 7 | Grade 8 | CAPS NS Grade 8 "Particle model of matter" (which also includes density). |
| Balancing chemical equations | Grade 9 (Physical Sciences) | Grade 9 Natural Sciences | CAPS NS Grade 9 "Chemical reactions": equations must be written balanced. |
| Speed, distance and time | Grade 9 | Grade 10 | Physical Sciences Grade 10 "Motion in one dimension". |
| Ohm's law and series circuits | Grade 10 | Grade 11 | Ohm's law is Grade 11 Electric circuits (CAPS Physical Sciences, pp. 88–89). |
| Cell division | "mitosis and meiosis", Grade 10 | "Cell division: mitosis", Grade 10 | Grade 10 Life Sciences covers the cell cycle and mitosis; meiosis is Grade 12. The question templates no longer ask about meiosis. |
| Projectile motion | name | "Vertical projectile motion" | CAPS Grade 12 covers vertical projectile motion only (the templates were already vertical-only). |

## 3. Natural Sciences Grades 7–9: topic-by-topic coverage (FACT for the topic list)

Topic names are from the CAPS Natural Sciences Grades 7–9 content overview. ✓ = a Bonisa skill teaches it; ◐ = partly; ✗ = GAP.

**Grade 7**
- Life and Living: The biosphere ✗ · Biodiversity ✓ (Classifying animals) · Sexual reproduction ✗ · Variation ✗
- Matter and Materials: Properties of materials ✗ · Separating mixtures ◐ (Grade 6 Mixtures and solutions) · Acids, bases and neutrals ◐ (Grade 9 Acids, bases and pH) · Introduction to the Periodic Table ✓ **new**
- Energy and Change: Sources of energy ✗ · Potential and kinetic energy ✗ · Heat transfer ✓ · Insulation and energy saving ✗ · Energy transfer to surroundings ✗ · The national electricity supply system ✗
- Planet Earth and Beyond: Relationship of the Sun to the Earth ✓ **new** (The Sun and the seasons) · Relationship of the Moon to the Earth ✓ **new** (The Moon, gravity and tides) · Historical development of astronomy ◐ (Galileo in Beyond the Solar System)

**Grade 8**
- Life and Living: Photosynthesis and respiration ✓ · Interactions and interdependence within the environment ✓ (Food chains and energy flow) · Micro-organisms ✗
- Matter and Materials: Atoms ✗ · Particle model of matter ✓ (States of matter; Density) · Chemical reactions ◐ (Grade 9 Balancing equations)
- Energy and Change: Static electricity ✗ · Energy transfer in electrical systems ✗ · Series and parallel circuits ✓ · Visible light ✓ **new**
- Planet Earth and Beyond: The Solar System ✓ · Beyond the Solar System ✓ **new** · Looking into space ✓ **new**

**Grade 9**
- Life and Living: Cells as the basic units of life ✗ (Grade 10 Cell structure exists) · Systems in the human body ✓ · Human reproduction ✗ · Circulatory and respiratory systems ✓ · Digestive system ✓ (all three in Circulation, breathing and digestion)
- Matter and Materials: Compounds ✗ · Chemical reactions ✓ · Reactions of metals with oxygen ✗ · Reactions of non-metals with oxygen ✗ · Acids & bases, and pH value ✓ · Reactions of acids with bases ◐ · Reactions of acids with metals ✗
- Energy and Change: Forces ✗ · Electric cells as energy systems ✗ · Resistance ◐ · Series and parallel circuits ✓ · Safety with electricity ✗ · Energy and the national electricity grid ✗ · Cost of electrical power ✗
- Planet Earth and Beyond: The Earth as a system ✓ **new** · Lithosphere ✓ **new** · Mining of mineral resources ✓ **new** · Atmosphere ✓ **new** · Birth, life and death of stars ✓ **new**

**Summary:** 24 of the 56 Senior Phase topics are covered fully and 6 partly (30 of 56, about 54%). Planet Earth and Beyond went from 0 of 11 to 10 of 11 fully and 1 partly. Every Senior Phase grade now has at least one skill in each of the four strands (enforced by a test).

## 4. Mathematics: topic-by-topic coverage (FACT for the topic lists)

Topic names are from the DBE CAPS Mathematics documents for Grades 4–6, 7–9 and 10–12. ✓ = a Bonisa skill teaches it; ◐ = partly; ✗ = GAP.

### Grade 12 final exam (FACT)

Each paper is 150 marks and 3 hours. Paper 1: patterns and sequences 25, algebra and equations 25, functions and graphs 35, finance 15, differential calculus 35, probability 15. Paper 2: Euclidean geometry and measurement 50, analytical geometry 40, trigonometry 40, statistics and regression 20 (each ± 3).

### Grades 10–12

| Topic | Gr 10 | Gr 11 | Gr 12 |
|---|---|---|---|
| Algebraic expressions | ✓ factorising trinomials (✗ surds, binomial × trinomial, sums and differences of cubes, algebraic fractions) | | |
| Exponents and surds | ✓ laws of exponents | ✗ surds, surd equations | |
| Number patterns, sequences and series | ✗ linear patterns | ✗ quadratic patterns | ✓ arithmetic and geometric sequences and series |
| Equations and inequalities | ◐ quadratics by factorising (✗ simultaneous, literal, inequalities) | ◐ quadratic formula (✗ completing the square, quadratic inequalities, nature of roots, linear–quadratic systems) | |
| Functions | ◐ straight lines (✗ parabola, hyperbola, exponential) | ✗ parameters, average gradient, trig graphs | ✗ inverses, logarithms ✗ polynomials (factor and remainder theorems) |
| Finance, growth and decay | ✓ simple and compound interest | ✗ depreciation, nominal and effective rates | ✗ annuities, loans |
| Trigonometry | ◐ ratios (✗ special angles, equations) | ✗ identities, reduction, general solution, sine, cosine and area rules | ✗ compound and double angles, 2D and 3D |
| Euclidean geometry | ◐ quadrilaterals, midpoint theorem and converse | ◐ all seven circle theorems and converses | ◐ proportionality, similarity, Pythagoras by similar triangles |
| Analytical geometry | ✓ distance, midpoint, gradient; parallel, perpendicular and collinear points | ✓ equation of a line (through a point, parallel, perpendicular), inclination, angle between lines | ✓ equation of a circle (any centre, completing the square), tangent at a point |
| Statistics | ✗ central tendency, quartiles, box-and-whisker | ✗ ogives, variance and standard deviation | ✗ regression and correlation |
| Measurement | ✗ surface area and volume of solids | | |
| Probability | ✗ Venn diagrams, mutually exclusive events | ✗ independent events, tree diagrams | ✗ counting principle |
| Differential calculus | | | ◐ derivatives (✗ first principles, cubic graphs, optimisation) |

### Grades 7–9 (every topic runs through all three grades)

| Content area | Topics |
|---|---|
| Numbers, operations and relationships | Whole numbers ◐ (order of operations) · Exponents ✗ · Integers ✓ · Common fractions ✓ · Decimal fractions ✗ |
| Patterns, functions and algebra | Numeric and geometric patterns ✗ · Functions and relationships ✗ · Algebraic expressions ✓ · Algebraic equations ✓ · Graphs ◐ (gradient) |
| Space and shape (geometry) | Construction of geometric figures ✗ · Geometry of 2D shapes ✗ · Geometry of straight lines ✗ · Geometry of 3D objects ✗ · Transformation geometry ✗ |
| Measurement | Area and perimeter of 2D shapes ◐ (Grade 5 skill) · Surface area and volume of 3D objects ✗ · Theorem of Pythagoras ✗ |
| Data handling | Collect, organise and summarise ✗ · Represent ✗ · Interpret, analyse and report ✗ · Probability ✗ |

### Grades 4–6

| Content area | Topics |
|---|---|
| Numbers, operations and relationships | Whole numbers ✓ (place value, multiplication and division) · Common fractions ✓ · Decimal fractions ✓ (Grade 6) · Percentages ✗ |
| Patterns, functions and algebra | Numeric patterns ✗ · Geometric patterns ✗ · Number sentences ✗ |
| Space and shape | Properties of 2D shapes ✗ · Properties of 3D objects ✗ · Symmetry ✗ · Transformations ✗ · Viewing objects ✗ · Position and movement ✗ |
| Measurement | Length ✗ · Mass ✗ · Capacity/volume ✗ · Time ✗ · Temperature ✗ · Perimeter, area and volume ✓ |
| Data handling | Collecting and organising ✗ · Representing ✗ · Analysing and reporting ✗ · Probability ✗ |

**Summary.** Mathematics covers algebra and number well. Geometry, measurement, data handling and probability are missing in Grades 4–9. In Grades 10–12, Euclidean geometry (50 of Paper 2's 150 marks, proofs still to come) and analytical geometry (40 marks) are now built; most of trigonometry (40) and all of statistics (20) are not.

**Euclidean geometry: what ◐ means.** Every theorem in the Grades 10–12 list is taught (lesson and lab) and practised: calculate angles and lengths from a diagram, give the reason for a step, and solve for x using a theorem. Not yet: writing a full multi-step proof in statement–reason form (the "riders" that carry most exam marks), and proving the theorems themselves (CAPS requires learners to prove some of them). Step-by-step proof input is the next piece of work on this topic.

### Build order

1. **Paper 2, Grades 10–12:** ~~Euclidean geometry~~ (built, proofs still to come), ~~analytical geometry~~ (built), then trigonometry, statistics. Half the Grade 12 maths mark.
2. **Paper 1 gaps, Grades 10–12:** functions and graphs, probability, equations and inequalities, finance, calculus.
3. **Grades 7–9:** geometry (2D, straight lines, construction), exponents, Pythagoras, data handling and probability, patterns.
4. **Grades 4–6:** measurement, 2D and 3D shapes, patterns, data handling.

Every topic gets the core (generator with diagnosed mistakes, a short lesson, mastery and tests). Labs go where manipulating something teaches: graphs, geometry, probability.

## 5. Other subjects: what is covered (INFERENCE until audited the same way)

| Subject | Skills per grade | Covered | Biggest known gaps (from the CAPS overviews) |
|---|---|---|---|
| Natural Sciences and Technology 4–6 | G4: 5, G5: 4, G6: 3 | All four strands and Technology: Structures | Rocket systems; systems to explore the Moon and Mars; Processing and Systems and control (Technology); more Life and Living and Energy topics |
| Physical Sciences 10–12 | G10: 4, G11: 2, G12: 1 | Motion, mechanical energy, Newton's second law, vertical projectile motion, Ohm's law, the atom, the mole | Waves, sound and light; electrostatics; momentum and impulse; work, energy and power; chemical bonding; rates and equilibrium; acids and bases (FET); organic chemistry; electrochemistry |
| Life Sciences 10–12 | G10: 2, G12: 1 | Cells, mitosis, monohybrid crosses | Biodiversity and classification (FET), plant and animal tissues, support and transport systems, nutrition, meiosis and DNA, human reproduction, nervous and endocrine systems, evolution, human impact |

## 6. What it would take to say "CAPS-aligned"

1. Audit NS&T, Physical Sciences and Life Sciences topic by topic against the CAPS documents and the current Annual Teaching Plans, as sections 3 and 4 do for Natural Sciences and Mathematics.
2. Have a practising teacher in each phase review the mappings in `src/shared/curriculum/catalogue.ts`.
3. Until then, describe Bonisa as "organised by CAPS subjects, phases and strands", not as "fully CAPS-aligned".

## Sources

- DBE, CAPS Mathematics Grades 10–12: https://www.education.gov.za/Portals/0/CD/National%20Curriculum%20Statements%20and%20Vocational/CAPS%20FET%20_%20MATHEMATICS%20_%20GR%2010-12%20_%20Web_1133.pdf
- DBE, CAPS Mathematics Grades 7–9: https://www.education.gov.za/Portals/0/CD/National%20Curriculum%20Statements%20and%20Vocational/CAPS%20SP%20%20MATHEMATICS%20GR%207-9.pdf
- DBE, CAPS Mathematics Grades 4–6 (copy hosted by Graeme College): https://www.graemecollege.co.za/media/1249/caps-ip-mathematics-gr-4-6-web.pdf

- DBE, Curriculum and Assessment Policy Statement, Natural Sciences Grades 7–9: https://www.education.gov.za/Portals/0/CD/National%20Curriculum%20Statements%20and%20Vocational/CAPS%20SP%20%20NATURAL%20SCIENCES%20GR%207-9%20%20WEB.pdf
- DBE, 2023/24 Annual Teaching Plan, Natural Sciences and Technology Grade 4: https://www.education.gov.za/Portals/0/Documents/Recovery%20plan%20page/2023%20ATPs/GET%20Intermediate%20Phase%20Content%20Subjects/Grade%204/1.070%20ATP%202023-24%20Gr%204%20NS%20Tech%20final.pdf
- PILO, Physical Sciences Grade 10 and 11 Electric Circuits (extracts from CAPS pp. 42–45 and 88–89): https://pilo.co.za/wp-content/uploads/2021/12/FET-PS-Gr-10-and-11-JiT-2017-Term-2-V1-PH.pdf
- NECT, Grade 6 Term 2 Mathematics content booklet (whole numbers to 9 digits; decimal fractions in Grade 6): https://admin.nect.org.za/materials/maths/term-2/content-booklets/gr-6-term-2-2020-maths-content-booklet.pdf
