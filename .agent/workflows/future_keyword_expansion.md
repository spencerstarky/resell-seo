---
description: Roadmap for expanding Safe Keyword Injection across categories
---

# Feature: Category-Specific Keyword Injection

## Objective
To safely maximize SEO scores by injecting high-value, non-physical keywords (e.g., "Vintage", "Travel", "Y2K") based on the item category, without hallucinating physical attributes (Size, Material).

## Current State
- **General Logic:** Implemented a general "Safe vs Unsafe" expansion rule in the System Prompt.
- **Tumi/Bags:** Specifically tuned for Business/Travel keywords.
- **Safety:** "Mens/Medium" filters are active for Bags/Tech.

## Future Expansion Plan
We want to define "Safe Keyword Lists" for other major categories:

### 1. Sneakers
- **Safe:** "Athletic, Running, casual, Streetwear, Retro, Collector"
- **Unsafe:** "Wide, Narrow, [Size]"

### 2. Jeans/Denim
- **Safe:** "Classic, Designer, Durable, Work, Casual"
- **Unsafe:** "Stretch, Selvedge" (Unless visible)

### 3. Electronics
- **Safe:** "Professional, Home, Office, Portable"
- **Unsafe:** "4K, 5G, [Capacity]"

### 4. Vintage Clothing
- **Safe:** "Retro, 90s, Y2K, Grunge, Streetwear"
- **Unsafe:** "Silk, Wool"

## Implementation Strategy
- **Prompt Engineering:** Create a "Category Matrix" in the system prompt.
- **Dynamic Context:** If we can detect the category from eBay API, pass it explicitly to the prompt to select the correct keyword bank.
