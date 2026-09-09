"""Regression checks and independent controls from the adversarial audit."""
import copy
import json
import subprocess
import sys
from unittest.mock import patch
from validation import differential, exhaustive, mutations
from validation.oracle.gentle_oracle import GentleAlgebra
from validation.verifier.verify import verify

def quiver(vertices, endpoints, relations):
    return {'vertices':[{'id':str(i),'label':str(i)} for i in range(vertices)],
            'arrows':[{'id':str(i),'label':str(i),'source':str(s),'target':str(t)} for i,(s,t) in enumerate(endpoints)],
            'relations':[[str(a),str(b)] for a,b in relations]}

def controls():
    # Expected tuples are (dim A, HH_0, HH^0, HH_1, HH^1).
    cases=[('k',quiver(1,[],[]),(1,1,1,0,0)),
           ('k+k',quiver(2,[],[]),(2,2,2,0,0)),
           ('arrow',quiver(2,[(0,1)],[]),(3,2,1,0,0)),
           ('dual',quiver(1,[(0,0)],[(0,0)]),None),
           ('two-cycle',quiver(2,[(0,1),(1,0)],[(0,1),(1,0)]),(4,2,1,1,1)),
           ('Kronecker',quiver(2,[(0,1),(0,1)],[]),(4,2,1,0,3))]
    requests=[{'presentation':q,'characteristic':p,'maxDegree':1} for _,q,_ in cases for p in [0,2,3,5]]
    production=differential.production_results(requests)
    assert len(production)==len(requests)
    for (name,q,known), offset in zip(cases,range(0,len(requests),4)):
        for j,p in enumerate([0,2,3,5]):
            expected=known or (2,2,2,2 if p==2 else 1,2 if p==2 else 1)
            o=GentleAlgebra(q).dimensions(p,1)
            actual=production[offset+j]; rows=actual['rows']
            assert (o['algebra_dimension'],o['hh_homology'][0],o['hh_cohomology'][0],o['hh_homology'][1],o['hh_cohomology'][1])==expected,(name,p,o)
            assert (actual['algebra_dimension'],rows[0]['hh_homology'],rows[0]['hh_cohomology'],rows[1]['hh_homology'],rows[1]['hh_cohomology'])==expected,(name,p,actual)
    ps,counts=exhaustive.enumerate_presentations()
    assert counts=={'raw_presentations':108,'valid_presentations':25,'canonical_presentations':11}
    # A different internally consistent complex on the same true chain bases:
    # set both boundaries to zero and claim the whole chain space as homology.
    cert=json.loads(subprocess.check_output(['node','validation/certificate.mjs','--case','dual numbers','--degree','1'],text=True))
    assert verify(cert)['valid']
    n=len(cert['bases']['c'])
    for matrix in cert['matrices'].values():
        matrix['entries']=[['0']*matrix['columns'] for _ in range(matrix['rows'])]
    cert['claimed_dimension']=n
    cert['representatives']=[['1' if i==j else '0' for i in range(n)] for j in range(n)]
    try: verify(cert)
    except ValueError as e: assert 'differentials' in str(e);print('Unrelated zero-boundary certificate rejected:',e)
    else: raise AssertionError('unrelated certificate accepted')
    print('Hand controls passed: six algebras in four characteristics (120 scalar checks); enumeration counts confirmed.')

mode=sys.argv[1] if len(sys.argv)>1 else 'controls'
if mode=='controls': controls()
elif mode=='empty-bridge':
    for module,args in ((differential,([quiver(1,[],[])],)),(exhaustive,())):
        with patch.object(module,'production_results',return_value=[]):
            try: module.run(*args)
            except ValueError as error:
                assert 'response count' in str(error)
                print(module.__name__,'rejects empty bridge:',error)
            else: raise AssertionError('F2: harness accepts zero bridge results')
elif mode=='mutation':
    fixtures=copy.deepcopy(mutations.fixture_values())
    fixtures['aps']['signature']['boundaries'][0][1]*=-1
    with patch.object(mutations,'fixture_values',return_value=fixtures):
        try: mutations.run()
        except ValueError as error:
            assert 'APS baseline' in str(error)
            print('Wrong APS baseline rejected:',error)
        else: raise AssertionError('F3: wrong baseline APS sign accepted')
else: raise ValueError('Use controls, empty-bridge, or mutation')
