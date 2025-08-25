(define (domain deliveroo-grid)
  (:requirements :strips :typing)
  
  (:types agent tile)
  
  (:predicates
    (at ?a - agent ?t - tile)        ; agent is at a tile
    (adjacent ?t1 - tile ?t2 - tile) ; adjacency relation (both directions)
    (free ?t - tile)                 ; tile is free (not occupied)
  )

  (:action move
    :parameters (?a - agent ?from - tile ?to - tile)
    :precondition (and
      (at ?a ?from)
      (adjacent ?from ?to)
      (free ?to))
    :effect (and
      (not (at ?a ?from))
      (at ?a ?to)
      (free ?from)
      (not (free ?to))))
)
