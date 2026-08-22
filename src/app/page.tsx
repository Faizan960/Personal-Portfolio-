/**
 * Section composition and order.
 *
 * The sequence is progressive rather than resume-shaped: identity, then what he
 * can do, then proof of it, then the record behind it. Each section's mono index
 * (01–08) is hardcoded in the component and must match its position here.
 *
 *   Hero        —   the statement
 *   About       01  who
 *   Skills      02  what with
 *   Work        03  what he built with it
 *   Experience  04  where that has been applied
 *   Education   05  the formal record
 *   Exploring   06  where it is going
 *   Recognition 07  outside confirmation
 *   Contact     08  the way in
 *
 * `navSections` in the data file is a five-item subset of these ids in the same
 * relative order, so the scroll-spy indicator only ever moves monotonically.
 * Education, Exploring and Recognition are deliberately absent from the nav but
 * remain scroll targets.
 */

import { Hero } from "@/components/hero/Hero";
import { About } from "@/components/About";
import { Skills } from "@/components/Skills";
import { Projects } from "@/components/Projects";
import { Experience } from "@/components/Experience";
import { Education } from "@/components/Education";
import { CurrentlyExploring } from "@/components/CurrentlyExploring";
import { Recognition } from "@/components/Recognition";
import { Contact } from "@/components/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Experience />
      <Education />
      <CurrentlyExploring />
      <Recognition />
      <Contact />
    </>
  );
}
