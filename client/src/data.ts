import { AudioPreset, PedalComponentSpec } from './types';

export const AUDIO_PRESETS: AudioPreset[] = [
  { id: 'clean', name: 'Clean Guitar', description: 'Transparent comparison', dryUrl: '#', processedUrl: '#' },
  { id: 'crunch', name: 'Crunch', description: 'Added character and warmth', dryUrl: '#', processedUrl: '#' },
  { id: 'overdrive', name: 'Overdrive', description: 'Classic analog push', dryUrl: '#', processedUrl: '#' },
  { id: 'heavy', name: 'Heavy Drive', description: 'Aggressive output', dryUrl: '#', processedUrl: '#' },
  { id: 'ambient', name: 'Ambient', description: 'Spacious and wide', dryUrl: '#', processedUrl: '#' },
  { id: 'lead', name: 'Lead Tone', description: 'Sustain and singing tone', dryUrl: '#', processedUrl: '#' },
];

export const PEDAL_COMPONENTS: PedalComponentSpec[] = [
  {
    id: 'enclosure',
    name: 'Rugged Enclosure',
    description: 'Road-ready aluminum chassis designed to take a beating.',
    technicalSpecs: ['Die-cast aluminum', 'Matte black powder coat']
  },
  {
    id: 'knobs',
    name: 'Precision Controls',
    description: 'Tactile, high-resistance potentiometers for exact dialing.',
    technicalSpecs: ['Alpha pots', 'Custom machined aluminum caps']
  },
  {
    id: 'switch',
    name: 'True Bypass Footswitch',
    description: 'Zero tone coloration when disengaged.',
    technicalSpecs: ['3PDT mechanical switch', 'Heavy-duty spring']
  },
  {
    id: 'pcb',
    name: 'Main PCB',
    description: 'Through-hole analog design for maximum component quality.',
    technicalSpecs: ['FR4 glass epoxy', 'Gold-plated traces']
  },
  {
    id: 'opamp',
    name: 'Gain Stage (JRC4558D)',
    description: 'The classic operational amplifier for smooth, musical clipping.',
    technicalSpecs: ['Dual Op-Amp', 'Symmetric clipping']
  }
];
