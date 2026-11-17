import sqlite3, json, sys
con = sqlite3.connect("file:" + sys.argv[1] + "?immutable=1", uri=True); con.row_factory = sqlite3.Row
q = lambda s: [dict(r) for r in con.execute(s)]
CS=['Alive','Dead','Missing','Forgotten']; CT=['NPC','PartyMember']; GT=['Faction','SocialClass']
AT=['Infrastructure','Artifact','Resource','Intelligence']; AR=['Operational','Strategic','Symbolic','Covert','Mandate']; AS=['Stable','Contested','Damaged','Destroyed']
GS=['Plotting','Progressing','Stalled','Accomplished','Failed','Retired']; GC=['Achieve','Maintain']; GP=['Critical','Major','Minor']; GV=['Open','Known','Secret']; TT=['Faction','Character','Asset']
DD=['a','b','c','ab','ac','bc']
BP=lambda x: None if x is None else ['positive','neutral','negative'][x]; LS=['Active','Abandoned','Ruined','Unknown']
v=lambda r:{'a':r['TruthValue'],'b':r['StabilityValue'],'c':r['AgencyValue']}
out={}
out['factions']=[{'id':r['Id'],'name':r['Name'],'type':GT[r['Type']],'active':bool(r['Active']),'momentum':r['Momentum'],'baseLegitimacy':r['BaseLegitimacy'] if 'BaseLegitimacy' in r.keys() else 50,'powerModifier':r['PowerModifier'],'factionSize':r['FactionSize'] if 'FactionSize' in r.keys() else 0,'leaderId':r['LeaderId'],'values':v(r),'beliefa':BP(r['BeliefA']),'beliefb':BP(r['BeliefB']),'beliefc':BP(r['BeliefC'])} for r in q("select * from Factions")]
out['characters']=[{'id':r['Id'],'name':r['Name'],'characterType':CT[r['CharacterType']],'factionId':r['FactionId'],'socialClassId':r['SocialClassId'],'state':CS[r['State']],'pressure':r['Pressure'],'conviction':r['Conviction'],'influence':r['Influence'],'impressionable':r['Impressionable'],'doubtDirection':DD[r['DoubtDirection']] if r['DoubtDirection'] is not None else None,'values':v(r),'locationId':r['LocationId'],'narrativeTier':['Major','Supporting','Minor','Background'][r['NarrativeTier']] if r['NarrativeTier'] is not None else None,'beliefa':BP(r['BeliefA']),'beliefb':BP(r['BeliefB']),'beliefc':BP(r['BeliefC'])} for r in q("select * from Characters")]
out['assets']=[{'id':r['Id'],'name':r['Name'],'type':AT[r['Type']],'role':AR[r['Role']],'tier':r['Tier'],'keystone':bool(r['Keystone']),'status':AS[r['Status']],'controllingFactionId':r['ControllingFactionId'],'locationId':r['LocationId'],'statusActorFactionId':r['StatusActorFactionId']} for r in q("select * from Assets")]
out['goals']=[{'id':r['Id'],'factionId':r['FactionId'],'title':r['Title'],'status':GS[r['Status']],'conditionType':GC[r['ConditionType']],'priority':GP[r['Priority']],'visibility':GV[r['Visibility']],'targetEntityType':TT[r['TargetEntityType']] if r['TargetEntityType'] is not None else None,'targetEntityId':r['TargetEntityId'],'targetState':r['TargetState'],'targetOwnerFactionId':r['TargetOwnerFactionId'],'championId':r['ChampionId'],'targetProperty':r['TargetProperty'],'targetOperator':r['TargetOperator'],'targetThreshold':r['TargetThreshold'],
  # §18.2/§18.6 (columns added later; defaults when exporting an older database)
  'outcomeMode':['Automatic','Adjudicated'][r['OutcomeMode']] if 'OutcomeMode' in r.keys() else 'Automatic',
  'earliestAct':r['EarliestAct'] if 'EarliestAct' in r.keys() else 2} for r in q("select * from FactionGoals")]
out['locations']=[{'id':r['Id'],'name':r['Name'],'state':LS[r['State']]} for r in q("select * from Locations")]
ses=q("select * from Sessions order by Number")
for s in ses:
  evs=q(f"select * from Events where SessionId='{s['Id']}'")
  s2={'id':s['Id'],'number':s['Number'],'title':s['Title'],'act':s['Act'],'week':s['Week'],'events':[]}
  for e in evs:
    efs=q(f"select * from EventEffects where EventId='{e['Id']}'")
    s2['events'].append({'id':e['Id'],'sessionId':s['Id'],'title':e['Title'],'sortOrder':e['SortOrder'],'isSynthetic':bool(e['IsSynthetic']),'effects':[{'id':f['Id'],'eventId':e['Id'],'targetType':f['TargetType'],'targetId':f['TargetId'],'property':f['Property'],'delta':f['Delta'],'value':f['Value'],'secondaryTargetId':f['SecondaryTargetId'],'actorFactionId':f['ActorFactionId']} for f in efs]})
  out.setdefault('sessions',[]).append(s2)
rc=q("select * from RulesConfigs")[0]; CURVES=['Linear','Quadratic','Cubic','Exponential']
out['rules']={'id':rc['Id'],'beliefMatch':rc['BeliefMatch'],'beliefConflict':rc['BeliefConflict'],'valueAlignmentScale':rc['ValueAlignmentScale'],'valueConflictScale':rc['ValueConflictScale'],'stressPositiveMultiplierPerPoint':rc['StressPositiveMultiplierPerPoint'],'stressNegativeMultiplierPerPoint':rc['StressNegativeMultiplierPerPoint'],'positiveEnabled':bool(rc['PositiveEnabled']),'negativeEnabled':bool(rc['NegativeEnabled']),'thresholdsJson':rc['ThresholdsJson'],'beliefAxisLabelsJson':rc['BeliefAxisLabelsJson'],'stressWeightEnabled':bool(rc['StressWeightEnabled']),'stressWeightCurve':CURVES[rc['StressWeightCurve']] if isinstance(rc['StressWeightCurve'],int) else rc['StressWeightCurve'],'stressWeightIntensity':rc['StressWeightIntensity'],'cascadeRulesJson':rc['CascadeRulesJson'],'stressTriggersJson':rc['StressTriggersJson'],'formulasJson':rc['FormulasJson'],'influenceConvictionScale':rc['InfluenceConvictionScale']}
cs=q("select * from ColonyStates")[0]; out['colonyState']={'colonyStress':cs['ColonyStress'],
  'partyValues':{'a':cs['PartyTruthValue'],'b':cs['PartyStabilityValue'],'c':cs['PartyAgencyValue']},
  'partyBeliefa':BP(cs['PartyBeliefA']),'partyBeliefb':BP(cs['PartyBeliefB']),'partyBeliefc':BP(cs['PartyBeliefC'])}
json.dump(out,open(sys.argv[2],'w'),indent=1)
print({k:len(v) if isinstance(v,list) else 1 for k,v in out.items()})
