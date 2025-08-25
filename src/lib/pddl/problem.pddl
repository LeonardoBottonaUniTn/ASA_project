(define (problem deliveroo-problem)
  (:domain deliveroo-grid)
  (:objects
    agent1 - agent
    tile-1-0 - tile
    tile-5-0 - tile
    tile-6-0 - tile
    tile-1-1 - tile
    tile-5-1 - tile
    tile-6-1 - tile
    tile-0-2 - tile
    tile-1-2 - tile
    tile-2-2 - tile
    tile-3-2 - tile
    tile-4-2 - tile
    tile-5-2 - tile
    tile-6-2 - tile
    tile-7-2 - tile
    tile-8-2 - tile
    tile-9-2 - tile
    tile-1-3 - tile
    tile-5-3 - tile
    tile-6-3 - tile
    tile-9-3 - tile
    tile-0-4 - tile
    tile-1-4 - tile
    tile-2-4 - tile
    tile-3-4 - tile
    tile-4-4 - tile
    tile-5-4 - tile
    tile-6-4 - tile
    tile-8-4 - tile
    tile-9-4 - tile
    tile-1-5 - tile
    tile-5-5 - tile
    tile-6-5 - tile
    tile-8-5 - tile
    tile-0-6 - tile
    tile-1-6 - tile
    tile-2-6 - tile
    tile-3-6 - tile
    tile-4-6 - tile
    tile-5-6 - tile
    tile-6-6 - tile
    tile-7-6 - tile
    tile-8-6 - tile
    tile-9-6 - tile
    tile-1-7 - tile
    tile-5-7 - tile
    tile-6-7 - tile
    tile-1-8 - tile
    tile-2-8 - tile
    tile-3-8 - tile
    tile-5-8 - tile
    tile-6-8 - tile
    tile-1-9 - tile
    tile-3-9 - tile
    tile-4-9 - tile
    tile-5-9 - tile
    tile-6-9 - tile
    tile-7-9 - tile
    tile-8-9 - tile
    tile-9-9 - tile
  )
  (:init
    (at agent1 tile-1-5)
    (free tile-1-0)
    (free tile-5-0)
    (free tile-6-0)
    (free tile-1-1)
    (free tile-5-1)
    (free tile-6-1)
    (free tile-0-2)
    (free tile-1-2)
    (free tile-2-2)
    (free tile-3-2)
    (free tile-4-2)
    (free tile-5-2)
    (free tile-6-2)
    (free tile-7-2)
    (free tile-8-2)
    (free tile-9-2)
    (free tile-1-3)
    (free tile-5-3)
    (free tile-6-3)
    (free tile-9-3)
    (free tile-0-4)
    (free tile-1-4)
    (free tile-2-4)
    (free tile-3-4)
    (free tile-4-4)
    (free tile-5-4)
    (free tile-6-4)
    (free tile-8-4)
    (free tile-9-4)
    (free tile-1-5)
    (free tile-5-5)
    (free tile-6-5)
    (free tile-8-5)
    (free tile-0-6)
    (free tile-1-6)
    (free tile-2-6)
    (free tile-3-6)
    (free tile-4-6)
    (free tile-5-6)
    (free tile-6-6)
    (free tile-7-6)
    (free tile-8-6)
    (free tile-9-6)
    (free tile-1-7)
    (free tile-5-7)
    (free tile-6-7)
    (free tile-1-8)
    (free tile-2-8)
    (free tile-3-8)
    (free tile-5-8)
    (free tile-6-8)
    (free tile-1-9)
    (free tile-3-9)
    (free tile-4-9)
    (free tile-5-9)
    (free tile-6-9)
    (free tile-7-9)
    (free tile-8-9)
    (free tile-9-9)
    (adjacent tile-1-0 tile-1-1)
    (adjacent tile-5-0 tile-6-0)
    (adjacent tile-5-0 tile-5-1)
    (adjacent tile-6-0 tile-5-0)
    (adjacent tile-6-0 tile-6-1)
    (adjacent tile-1-1 tile-1-2)
    (adjacent tile-1-1 tile-1-0)
    (adjacent tile-5-1 tile-6-1)
    (adjacent tile-5-1 tile-5-2)
    (adjacent tile-5-1 tile-5-0)
    (adjacent tile-6-1 tile-5-1)
    (adjacent tile-6-1 tile-6-2)
    (adjacent tile-6-1 tile-6-0)
    (adjacent tile-0-2 tile-1-2)
    (adjacent tile-1-2 tile-2-2)
    (adjacent tile-1-2 tile-0-2)
    (adjacent tile-1-2 tile-1-3)
    (adjacent tile-1-2 tile-1-1)
    (adjacent tile-2-2 tile-3-2)
    (adjacent tile-2-2 tile-1-2)
    (adjacent tile-3-2 tile-4-2)
    (adjacent tile-3-2 tile-2-2)
    (adjacent tile-4-2 tile-5-2)
    (adjacent tile-4-2 tile-3-2)
    (adjacent tile-5-2 tile-6-2)
    (adjacent tile-5-2 tile-4-2)
    (adjacent tile-5-2 tile-5-3)
    (adjacent tile-5-2 tile-5-1)
    (adjacent tile-6-2 tile-7-2)
    (adjacent tile-6-2 tile-5-2)
    (adjacent tile-6-2 tile-6-3)
    (adjacent tile-6-2 tile-6-1)
    (adjacent tile-7-2 tile-8-2)
    (adjacent tile-7-2 tile-6-2)
    (adjacent tile-8-2 tile-9-2)
    (adjacent tile-8-2 tile-7-2)
    (adjacent tile-9-2 tile-8-2)
    (adjacent tile-9-2 tile-9-3)
    (adjacent tile-1-3 tile-1-4)
    (adjacent tile-1-3 tile-1-2)
    (adjacent tile-5-3 tile-6-3)
    (adjacent tile-5-3 tile-5-4)
    (adjacent tile-5-3 tile-5-2)
    (adjacent tile-6-3 tile-5-3)
    (adjacent tile-6-3 tile-6-4)
    (adjacent tile-6-3 tile-6-2)
    (adjacent tile-9-3 tile-9-4)
    (adjacent tile-9-3 tile-9-2)
    (adjacent tile-0-4 tile-1-4)
    (adjacent tile-1-4 tile-2-4)
    (adjacent tile-1-4 tile-0-4)
    (adjacent tile-1-4 tile-1-5)
    (adjacent tile-1-4 tile-1-3)
    (adjacent tile-2-4 tile-3-4)
    (adjacent tile-2-4 tile-1-4)
    (adjacent tile-3-4 tile-4-4)
    (adjacent tile-3-4 tile-2-4)
    (adjacent tile-4-4 tile-5-4)
    (adjacent tile-4-4 tile-3-4)
    (adjacent tile-5-4 tile-6-4)
    (adjacent tile-5-4 tile-4-4)
    (adjacent tile-5-4 tile-5-5)
    (adjacent tile-5-4 tile-5-3)
    (adjacent tile-6-4 tile-5-4)
    (adjacent tile-6-4 tile-6-5)
    (adjacent tile-6-4 tile-6-3)
    (adjacent tile-8-4 tile-9-4)
    (adjacent tile-8-4 tile-8-5)
    (adjacent tile-9-4 tile-8-4)
    (adjacent tile-9-4 tile-9-3)
    (adjacent tile-1-5 tile-1-6)
    (adjacent tile-1-5 tile-1-4)
    (adjacent tile-5-5 tile-6-5)
    (adjacent tile-5-5 tile-5-6)
    (adjacent tile-5-5 tile-5-4)
    (adjacent tile-6-5 tile-5-5)
    (adjacent tile-6-5 tile-6-6)
    (adjacent tile-6-5 tile-6-4)
    (adjacent tile-8-5 tile-8-6)
    (adjacent tile-8-5 tile-8-4)
    (adjacent tile-0-6 tile-1-6)
    (adjacent tile-1-6 tile-2-6)
    (adjacent tile-1-6 tile-0-6)
    (adjacent tile-1-6 tile-1-7)
    (adjacent tile-1-6 tile-1-5)
    (adjacent tile-2-6 tile-3-6)
    (adjacent tile-2-6 tile-1-6)
    (adjacent tile-3-6 tile-4-6)
    (adjacent tile-3-6 tile-2-6)
    (adjacent tile-4-6 tile-5-6)
    (adjacent tile-4-6 tile-3-6)
    (adjacent tile-5-6 tile-6-6)
    (adjacent tile-5-6 tile-4-6)
    (adjacent tile-5-6 tile-5-7)
    (adjacent tile-5-6 tile-5-5)
    (adjacent tile-6-6 tile-7-6)
    (adjacent tile-6-6 tile-5-6)
    (adjacent tile-6-6 tile-6-7)
    (adjacent tile-6-6 tile-6-5)
    (adjacent tile-7-6 tile-8-6)
    (adjacent tile-7-6 tile-6-6)
    (adjacent tile-8-6 tile-9-6)
    (adjacent tile-8-6 tile-7-6)
    (adjacent tile-8-6 tile-8-5)
    (adjacent tile-9-6 tile-8-6)
    (adjacent tile-1-7 tile-1-8)
    (adjacent tile-1-7 tile-1-6)
    (adjacent tile-5-7 tile-6-7)
    (adjacent tile-5-7 tile-5-8)
    (adjacent tile-5-7 tile-5-6)
    (adjacent tile-6-7 tile-5-7)
    (adjacent tile-6-7 tile-6-8)
    (adjacent tile-6-7 tile-6-6)
    (adjacent tile-1-8 tile-2-8)
    (adjacent tile-1-8 tile-1-9)
    (adjacent tile-1-8 tile-1-7)
    (adjacent tile-2-8 tile-3-8)
    (adjacent tile-2-8 tile-1-8)
    (adjacent tile-3-8 tile-2-8)
    (adjacent tile-3-8 tile-3-9)
    (adjacent tile-5-8 tile-6-8)
    (adjacent tile-5-8 tile-5-9)
    (adjacent tile-5-8 tile-5-7)
    (adjacent tile-6-8 tile-5-8)
    (adjacent tile-6-8 tile-6-9)
    (adjacent tile-6-8 tile-6-7)
    (adjacent tile-1-9 tile-1-8)
    (adjacent tile-3-9 tile-4-9)
    (adjacent tile-3-9 tile-3-8)
    (adjacent tile-4-9 tile-5-9)
    (adjacent tile-4-9 tile-3-9)
    (adjacent tile-5-9 tile-6-9)
    (adjacent tile-5-9 tile-4-9)
    (adjacent tile-5-9 tile-5-8)
    (adjacent tile-6-9 tile-7-9)
    (adjacent tile-6-9 tile-5-9)
    (adjacent tile-6-9 tile-6-8)
    (adjacent tile-7-9 tile-8-9)
    (adjacent tile-7-9 tile-6-9)
    (adjacent tile-8-9 tile-9-9)
    (adjacent tile-8-9 tile-7-9)
    (adjacent tile-9-9 tile-8-9)
  )
  (:goal (at agent1 tile-2-2))
)