# [To_Do_List_RPG]
*_"He'd wanted to get stronger every time he'd experienced a crisis. He'd wanted to escape the unstable lifestyle that made him feel like he was constantly hanging on the edge of a cliff [...] **The System will use me, and I will use the System.**"_* _- [Solo Leveling. Chugong. 2016, pp.176.]_

![The agent in the world](/assets/img1.png)

## [About]
*Every day errands, tasks or reminders become side quests to develop and evolve a virtual agent. When the user complete one of these side quests the agent grows bigger, faster and stronger capable to fullfil more complex tasks. Every time the agent *levels-up* the user can unlock one skill [every day skills, like cooking an omelette or wash clothes] that helps the agent to evolve and be more productive with its "life".*

## [Abstract]
*I generally struggle with setting tasks and goals and then following through on them. This doesn't mean I lack effort: I work every day to be productive and to pursue what I set out to do. Rather, it means that I tend to procrastinate when it comes to systematizing my goals into an orderly, continuous process of personal development and growth. To bridge that gap, I connected this frustration to an RPG-style gamification structure. Instead of treating tasks as isolated obligations, I reframed them as “every-day side quests” that generate visible rewards—experience points, level-ups, and unlockable skills—so that progress becomes concrete and motivating.*

*With this idea clear in my mind, I decided to draw on Daniel Shiffman’s explanation of genetic algorithms in *The Nature of Code* and treat my virtual agent as a kind of “living organism” simulation: it solves small problems and evolves based on the user’s interaction. In this context, completed tasks work like a fitness signal, repetition produces measurable progress, and the user’s decisions function like selection, shaping which skills and attributes get reinforced over time [Shiffman, 2012]. This is where the gamification layer becomes essential: by translating routines into visible feedback loops (XP, levels, unlocks), the system makes progress feel personal.*


## [General Rules]
*In a more concrete technical terms, the project is built around three core systems that I designed to work together and fully support this interactive experience: **the world**, **the task manager** and **the agent's status**.*

![System layout sketch](/assets/img2.png)

1. The user does not control *the agent's* actions in the world.
2. *The agent* has three base stats that can be improved as it levels-up:
   - [Agility] = speed to move in the world.
   - [Navigation] = obstacles avoiding capacity.
   - [Focus] =  detection of the goal.
3. The task manager defines all the side quests *the agent* will attempt to complete.
4. Each side quests has a difficulty level: **[D1]** three obstacles, **[D2]** six obstacles, **[D3]** eight obstacles in the world.
5. *The agent* will earn a specific amount of experience points [XP] for each side quest completed.
6. Every time *the agent* levels-up it will gain a new *every day skill*.
7. The skills represent an every day hability neccesary for being more productive: cooking, planning, budgeting, work out, etc.
8. When the user unlocks an skill, one of *the agent's* main stats may rose, making it more efficient at completing the following tasks. [e.g. cooking + 0.20 in Focus stat].
9. The user cannot access *the agent's* skill network unless it levels-up.
10. More than a player, the user acts as a taskmaster, choosing which side quest the agent should complete, monitoring its performance, and guiding its growth and improvement.

![Agent stats](/assets/img3.png)

<img style="float: right;" src="/assets/img4.png" width="450" height="330">

## [Technology Used]
*How did you make it, what libraries etc used*

## Requirements
*Tech stack, browser, OS, libs.*

## Screenshots / Media
*Include in-action visuals.*

## Credits / Acknowledgements
*Who made it, references.*

## License
*What license is it made under, if any?*

## Contact / Links
*GitHub repo link, website, demo URL.*
