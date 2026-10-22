# CardNearMe

A local trading card game (TCG) marketplace: players list the cards they offer and look for, find each other in their city and its stores, and agree trades they complete in person.

## Catalogue

**Game**:
A supported trading card game, such as Magic: The Gathering or Lorcana.
_Avoid_: TCG, title

**Set**:
A release within a Game, identified by its set code.
_Avoid_: Expansion, edition

**Card**:
A game piece identified by its name within a Game, regardless of where it was printed.
_Avoid_: Oracle card

**Printing**:
One release of a Card in a Set, with its own collector number.
_Avoid_: Version, edition, variant

## Binder

**Binder**:
Everything a Trader records about cards: their Collection and their Wants.
_Avoid_: Inventory, account

**Collection**:
The Printings a Trader owns, each with a quantity and condition; visible only to its owner.
_Avoid_: Owned cards, library

**Reserved quantity**:
The part of a Collection entry promised to other Traders in accepted Trades.
_Avoid_: In trade, locked, held

**Have**:
A Collection entry marked for trade, for a quantity no larger than the one owned.
_Avoid_: Offer, listing, for-trade item

**Want**:
A Card a Trader is looking for, optionally narrowed by Set, finish, language or minimum condition.
_Avoid_: Wishlist item, need

**List**:
A named group of one Trader's Haves, or of their Wants, whose visibility decides whether other Traders can see its contents.
_Avoid_: Trade list, folder, section

**Match**:
A Have of one Trader that satisfies a Want of another Trader in the same City.
_Avoid_: Hit, pairing

## Trading

**Trade**:
An exchange of cards, optionally balanced with cash, that two Traders agree in chat and carry out in person.
_Avoid_: Deal, proposal, swap

**Completed Trade**:
An accepted Trade that both Traders have confirmed took place.
_Avoid_: Closed trade, done trade

## Places

**City**:
A trading hub that groups Traders and Stores for Matching; proposing Trades in it unlocks once enough Traders have joined.
_Avoid_: Area, region

**Store**:
A physical game shop that Traders join and meet at.
_Avoid_: LGS, shop, venue

## People

**Trader**:
A signed-in person who keeps a Binder and trades with others.
_Avoid_: User (in domain talk), player, member
